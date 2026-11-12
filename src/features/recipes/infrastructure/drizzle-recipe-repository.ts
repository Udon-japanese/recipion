import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";
import type { DB } from "#/db/client";
import { UserFacingError } from "#/errors/user-facing-error";
import { parseDishCover } from "#/features/dish-art/domain/dish-cover";
import {
	ingredient,
	ingredientAlias,
} from "#/features/ingredients/infrastructure/ingredient.sql";
import { inventoryItem } from "#/features/inventory/infrastructure/inventory.sql";
import { user } from "#/integrations/better-auth/auth.sql";
import type { StoredRecipeIngredientNode } from "../application/prepare-recipe-for-storage";
import type {
	CreateRecipeCommand,
	RecipeDetail,
	RecipeRepository,
} from "../application/recipe-repository";
import { restoreRecipeIngredients } from "../application/restore-recipe-ingredients";
import { findRecipeCountViolation } from "../domain/recipe-limits";
import {
	canLinkToRecipe,
	parseRecipeVisibility,
} from "../domain/recipe-link-permission";
import { maxLinksPerRecipe } from "../domain/recipe-links";
import { toRecipeRevision } from "../domain/recipe-revision";
import { visiblePersonalTags } from "../domain/recipe-tags";
import { formatRecipeIngredientQuantity } from "./format-recipe-storage-number";
import {
	recipe,
	recipeIngredientNode,
	recipeInstruction,
	recipeLink,
	recipePreparation,
	recipeUnlock,
	recipeUnlockAttempt,
} from "./recipe.sql";

const uuidSchema = v.pipe(v.string(), v.uuid());

function validateIds(command: CreateRecipeCommand): void {
	for (const node of command.ingredients) {
		v.parse(uuidSchema, node.id);

		if (node.parentId !== null) {
			v.parse(uuidSchema, node.parentId);
		}
	}

	for (const preparation of command.preparations) {
		v.parse(uuidSchema, preparation.id);
	}

	for (const instruction of command.instructions) {
		v.parse(uuidSchema, instruction.id);

		for (const referencedId of instruction.referencedInstructionIds) {
			v.parse(uuidSchema, referencedId);
		}
	}
}

type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];

async function insertRecipeChildren(
	transaction: Transaction,
	userId: string,
	recipeId: string,
	command: CreateRecipeCommand,
): Promise<void> {
	// 親グループが先に並ぶため、材料は順番に保存する。
	for (const node of command.ingredients) {
		await transaction.insert(recipeIngredientNode).values({
			id: node.id,
			recipeId,
			userId,
			parentId: node.parentId,
			sortOrder: node.sortOrder,
			type: node.type,
			name: node.name,
			rawText: node.rawText,
			inferred: node.inferred,
			status: node.status,
			amountText: node.amountText,
			quantity:
				node.quantity === null
					? null
					: formatRecipeIngredientQuantity(node.quantity),
			unitLabel: node.unitLabel,
			scaleWeight: String(node.scaleWeight),
		});
	}

	if (command.preparations.length > 0) {
		await transaction.insert(recipePreparation).values(
			command.preparations.map((item) => ({
				id: item.id,
				recipeId,
				userId,
				sortOrder: item.sortOrder,
				text: item.text,
			})),
		);
	}

	if (command.instructions.length > 0) {
		await transaction.insert(recipeInstruction).values(
			command.instructions.map((item) => ({
				id: item.id,
				recipeId,
				userId,
				sortOrder: item.sortOrder,
				text: item.text,
				referencedInstructionIds: item.referencedInstructionIds,
			})),
		);
	}
}

// リンク先を調べて、リンクを保存する。リンク先が見つからない、リンクしてはいけないレシピ、自分自身の場合は、例外にして、保存全体を取り消す。
// リンク先が消えた（削除された・見られなくなった）リンクは、画面から送られてこない。本文にラベルが残っていれば、今の記録のまま残す
// （捨てると、リンク先を決めていないラベルと同じになり、買い物メモ・「つくった」で、ふつうの材料として扱われてしまう）。
async function replaceRecipeLinks(
	transaction: Transaction,
	userId: string,
	recipeId: string,
	{
		links,
		usedLinkLabels,
	}: Pick<CreateRecipeCommand, "links" | "usedLinkLabels">,
): Promise<void> {
	const sentLabels = new Set(links.map((link) => link.label));
	const keptRows = (
		await transaction
			.select({
				label: recipeLink.label,
				targetRecipeId: recipeLink.targetRecipeId,
			})
			.from(recipeLink)
			.where(eq(recipeLink.recipeId, recipeId))
	).filter(
		(row) => usedLinkLabels.includes(row.label) && !sentLabels.has(row.label),
	);

	if (links.length + keptRows.length > maxLinksPerRecipe) {
		throw new UserFacingError(`リンクは${maxLinksPerRecipe}個までです。`);
	}

	await transaction.delete(recipeLink).where(eq(recipeLink.recipeId, recipeId));

	if (keptRows.length > 0) {
		await transaction
			.insert(recipeLink)
			.values(keptRows.map((row) => ({ ...row, recipeId, userId })));
	}

	if (links.length === 0) {
		return;
	}

	const targets = await transaction
		.select({
			id: recipe.id,
			publicId: recipe.publicId,
			ownerUserId: recipe.userId,
			visibility: recipe.visibility,
		})
		.from(recipe)
		.where(
			inArray(
				recipe.publicId,
				links.map((link) => link.targetPublicId),
			),
		);
	const targetByPublicId = new Map(
		targets.map((target) => [target.publicId, target]),
	);

	const rows = links.map((link) => {
		const target = targetByPublicId.get(link.targetPublicId);

		if (
			!target ||
			!canLinkToRecipe(userId, {
				ownerUserId: target.ownerUserId,
				visibility: parseRecipeVisibility(target.visibility),
			})
		) {
			throw new UserFacingError(
				`リンク先のレシピが見つかりません：${link.label}`,
			);
		}

		if (target.id === recipeId) {
			throw new UserFacingError("このレシピ自身へはリンクできません");
		}

		return {
			recipeId,
			userId,
			label: link.label,
			targetRecipeId: target.id,
		};
	});

	await transaction.insert(recipeLink).values(rows);
}

// DB の材料の行を、木に戻す前の形にする（レシピの詳細と、みんなのレシピの材料のちょい見せで使う）。
export function toStoredIngredientNode(
	row: typeof recipeIngredientNode.$inferSelect,
): StoredRecipeIngredientNode {
	return {
		id: row.id,
		parentId: row.parentId,
		sortOrder: row.sortOrder,
		type: row.type === "group" ? "group" : "ingredient",
		name: row.name,
		rawText: row.rawText,
		inferred: row.inferred,
		status:
			row.status === "parsed" || row.status === "missing-amount"
				? row.status
				: null,
		amountText: row.amountText,
		quantity: row.quantity === null ? null : Number(row.quantity),
		unitLabel: row.unitLabel,
		scaleWeight: Number(row.scaleWeight),
	};
}

// 保存されたレシピを、読める形にする。リンク先は、見る人（viewerUserId）が見てよいものだけを、見つかるものとして返す。
export async function loadRecipeDetail(
	db: DB,
	found: typeof recipe.$inferSelect,
	viewerUserId: string,
): Promise<RecipeDetail> {
	const [ingredientRows, preparationRows, instructionRows, linkRows] =
		await Promise.all([
			db
				.select()
				.from(recipeIngredientNode)
				.where(eq(recipeIngredientNode.recipeId, found.id)),
			db
				.select()
				.from(recipePreparation)
				.where(eq(recipePreparation.recipeId, found.id))
				.orderBy(asc(recipePreparation.sortOrder)),
			db
				.select()
				.from(recipeInstruction)
				.where(eq(recipeInstruction.recipeId, found.id))
				.orderBy(asc(recipeInstruction.sortOrder)),
			db
				.select({
					label: recipeLink.label,
					targetPublicId: recipe.publicId,
					targetName: recipe.name,
					targetOwnerUserId: recipe.userId,
					targetOwnerName: user.name,
					targetVisibility: recipe.visibility,
				})
				.from(recipeLink)
				.leftJoin(recipe, eq(recipe.id, recipeLink.targetRecipeId))
				.leftJoin(user, eq(user.id, recipe.userId))
				.where(eq(recipeLink.recipeId, found.id))
				.orderBy(asc(recipeLink.label)),
		]);

	// 相手が消えた、または、今は見られないリンクは、相手が見つからないものとして返す（ラベルは残す）。
	const linkViews = linkRows.map((row) => {
		const canView =
			row.targetPublicId !== null &&
			row.targetName !== null &&
			row.targetOwnerUserId !== null &&
			row.targetVisibility !== null &&
			canLinkToRecipe(viewerUserId, {
				ownerUserId: row.targetOwnerUserId,
				visibility: parseRecipeVisibility(row.targetVisibility),
			});

		return {
			label: row.label,
			target:
				canView && row.targetPublicId !== null && row.targetName !== null
					? {
							publicId: row.targetPublicId,
							// 他の人のレシピは、「表示名の料理名」で見せる（自分のレシピと区別するため）。
							name:
								row.targetOwnerUserId !== viewerUserId &&
								row.targetOwnerName !== null
									? `${row.targetOwnerName}の${row.targetName}`
									: row.targetName,
						}
					: null,
		};
	});

	return {
		publicId: found.publicId,
		name: found.name,
		yieldText: found.yieldText,
		note: found.note,
		sourceUrl: found.sourceUrl,
		visibility: parseRecipeVisibility(found.visibility),
		stocksWhenMade: found.stocksWhenMade,
		scalable: found.scalable,
		cover: parseDishCover(found.cover),
		publicTags: found.publicTags,
		// 個人用のタグは、本人にだけ返す（他の人が見るレシピ・継承の親・リンク先では、空）。
		personalTags: visiblePersonalTags(found, viewerUserId),
		ingredients: restoreRecipeIngredients(
			ingredientRows.map(toStoredIngredientNode),
		),
		preparations: preparationRows.map((row) => ({
			id: row.id,
			text: row.text,
		})),
		instructions: instructionRows.map((row) => ({
			id: row.id,
			text: row.text,
			referencedInstructionIds: row.referencedInstructionIds,
		})),
		links: linkViews.flatMap((view) =>
			view.target
				? [{ label: view.label, targetPublicId: view.target.publicId }]
				: [],
		),
		linkViews,
	};
}

export function createDrizzleRecipeRepository(
	db: DB,
	userId: string,
	createPublicId: () => string = () => nanoid(),
): RecipeRepository {
	if (userId.trim().length === 0) {
		throw new Error("ユーザーIDを指定してください");
	}

	return {
		async create(command) {
			validateIds(command);

			return db.transaction(async (transaction) => {
				// 1人が持てるレシピの数の上限。
				const [owned] = await transaction
					.select({ total: count() })
					.from(recipe)
					.where(eq(recipe.userId, userId));
				const countViolation = findRecipeCountViolation(owned?.total ?? 0);

				if (countViolation) {
					throw new UserFacingError(countViolation);
				}

				const [createdRecipe] = await transaction
					.insert(recipe)
					.values({
						userId,
						publicId: createPublicId(),
						name: command.name,
						yieldText: command.yieldText,
						note: command.note,
						sourceUrl: command.sourceUrl,
						visibility: command.visibility,
						stocksWhenMade: command.stocksWhenMade,
						scalable: command.scalable,
						cover: command.cover,
						publicTags: command.publicTags,
						personalTags: command.personalTags,
						unlistedPassphrase: command.passphraseCipher ?? null,
						publishedAt: command.visibility === "private" ? null : new Date(),
						parentRecipeId: command.parent?.recipeId ?? null,
						parentSnapshot: command.parent?.snapshot ?? null,
					})
					.returning({ id: recipe.id, publicId: recipe.publicId });

				if (!createdRecipe) {
					throw new Error("レシピを作成できませんでした");
				}

				await insertRecipeChildren(
					transaction,
					userId,
					createdRecipe.id,
					command,
				);
				await replaceRecipeLinks(
					transaction,
					userId,
					createdRecipe.id,
					command,
				);

				return { id: createdRecipe.id, publicId: createdRecipe.publicId };
			});
		},

		async update(publicId, command, expectedRevision) {
			validateIds(command);

			return db.transaction(async (transaction) => {
				// 版の確かめから書き込みまでの間に、別の保存が割り込まないよう、行をロックする。
				const [existing] = await transaction
					.select({ id: recipe.id, updatedAt: recipe.updatedAt })
					.from(recipe)
					.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)))
					.for("update");

				if (!existing) return null;

				if (
					expectedRevision !== null &&
					toRecipeRevision(existing.updatedAt) !== expectedRevision
				) {
					return { status: "conflict" as const };
				}

				const [saved] = await transaction
					.update(recipe)
					.set({
						name: command.name,
						yieldText: command.yieldText,
						note: command.note,
						sourceUrl: command.sourceUrl,
						visibility: command.visibility,
						stocksWhenMade: command.stocksWhenMade,
						scalable: command.scalable,
						cover: command.cover,
						publicTags: command.publicTags,
						personalTags: command.personalTags,
						// 非公開から公開したときだけ、いまの日時。公開のままなら、最初に公開した日時を残す。
						publishedAt:
							command.visibility === "private"
								? null
								: sql`coalesce(${recipe.publishedAt}, now())`,
						// undefined は、いまのまま。変えるときは、これまでに開けた人の記録を消す。
						...(command.passphraseCipher === undefined
							? {}
							: { unlistedPassphrase: command.passphraseCipher }),
						...(command.parentSnapshot === undefined
							? {}
							: { parentSnapshot: command.parentSnapshot }),
					})
					.where(eq(recipe.id, existing.id))
					.returning({ updatedAt: recipe.updatedAt });

				// 作り置きのできあがり（在庫の食材）がすでにあれば、レシピの名前の変更に合わせる。
				const [madeItem] = await transaction
					.select({ ingredientId: inventoryItem.ingredientId })
					.from(inventoryItem)
					.where(
						and(
							eq(inventoryItem.userId, userId),
							eq(inventoryItem.sourceRecipeId, existing.id),
						),
					)
					.limit(1);

				if (madeItem) {
					await transaction
						.update(ingredient)
						.set({ name: command.name })
						.where(
							and(
								eq(ingredient.id, madeItem.ingredientId),
								eq(ingredient.userId, userId),
							),
						);
					await transaction
						.update(ingredientAlias)
						.set({ name: command.name })
						.where(
							and(
								eq(ingredientAlias.ingredientId, madeItem.ingredientId),
								eq(ingredientAlias.userId, userId),
								eq(ingredientAlias.isPrimary, true),
							),
						);
				}

				if (command.passphraseCipher !== undefined) {
					await transaction
						.delete(recipeUnlock)
						.where(eq(recipeUnlock.recipeId, existing.id));
					await transaction
						.delete(recipeUnlockAttempt)
						.where(eq(recipeUnlockAttempt.publicId, publicId));
				}

				// 材料・下準備・作り方は、すべて入れ替える（同じ ID で入れ直せる）。
				await transaction
					.delete(recipeIngredientNode)
					.where(eq(recipeIngredientNode.recipeId, existing.id));
				await transaction
					.delete(recipePreparation)
					.where(eq(recipePreparation.recipeId, existing.id));
				await transaction
					.delete(recipeInstruction)
					.where(eq(recipeInstruction.recipeId, existing.id));

				await insertRecipeChildren(transaction, userId, existing.id, command);
				await replaceRecipeLinks(transaction, userId, existing.id, command);

				return {
					status: "updated" as const,
					publicId,
					revision: toRecipeRevision(saved?.updatedAt ?? existing.updatedAt),
				};
			});
		},

		async delete(publicId) {
			// 材料・下準備・作り方は、外部キーの CASCADE で一緒に消える。
			const deleted = await db
				.delete(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)))
				.returning({ id: recipe.id });

			return deleted.length > 0;
		},

		async getByPublicId(publicId) {
			const [found] = await db
				.select()
				.from(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

			if (!found) return null;

			return loadRecipeDetail(db, found, userId);
		},

		async getForEdit(publicId) {
			const [found] = await db
				.select()
				.from(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

			if (!found) return null;

			return {
				recipe: await loadRecipeDetail(db, found, userId),
				revision: toRecipeRevision(found.updatedAt),
			};
		},

		async replaceParentSnapshot(publicId, snapshot) {
			const updated = await db
				.update(recipe)
				.set({
					parentSnapshot: snapshot,
					// 中身は変えないので、更新日時（画面の「更新」と、同時編集の版）は、そのまま。
					updatedAt: sql`${recipe.updatedAt}`,
				})
				.where(
					and(
						eq(recipe.publicId, publicId),
						eq(recipe.userId, userId),
						isNotNull(recipe.parentSnapshot),
					),
				)
				.returning({ id: recipe.id });

			return updated.length > 0;
		},

		async list() {
			const rows = await db
				.select({
					publicId: recipe.publicId,
					name: recipe.name,
					yieldText: recipe.yieldText,
					visibility: recipe.visibility,
					cover: recipe.cover,
					publicTags: recipe.publicTags,
					personalTags: recipe.personalTags,
					createdAt: recipe.createdAt,
				})
				.from(recipe)
				.where(eq(recipe.userId, userId))
				.orderBy(desc(recipe.createdAt));

			return rows.map((row) => ({
				publicId: row.publicId,
				name: row.name,
				yieldText: row.yieldText,
				visibility: parseRecipeVisibility(row.visibility),
				cover: parseDishCover(row.cover),
				publicTags: row.publicTags,
				personalTags: row.personalTags,
				createdAt: row.createdAt.toISOString(),
			}));
		},
	};
}
