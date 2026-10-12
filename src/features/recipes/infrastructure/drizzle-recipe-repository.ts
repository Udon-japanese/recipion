import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import type { DB } from "#/db/client";
import { user } from "#/integrations/better-auth/auth.sql";

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
import {
	formatRecipeIngredientQuantity,
	formatRecipeServings,
} from "./format-recipe-storage-number";
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
async function replaceRecipeLinks(
	transaction: Transaction,
	userId: string,
	recipeId: string,
	links: CreateRecipeCommand["links"],
): Promise<void> {
	await transaction.delete(recipeLink).where(eq(recipeLink.recipeId, recipeId));

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
			throw new Error(`リンク先のレシピが見つかりません：${link.label}`);
		}

		if (target.id === recipeId) {
			throw new Error("このレシピ自身へはリンクできません");
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
		servings: Number(found.servings),
		note: found.note,
		sourceUrl: found.sourceUrl,
		visibility: parseRecipeVisibility(found.visibility),
		ingredients: restoreRecipeIngredients(
			ingredientRows.map((row) => ({
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
			})),
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
					throw new Error(countViolation);
				}

				const [createdRecipe] = await transaction
					.insert(recipe)
					.values({
						userId,
						publicId: createPublicId(),
						name: command.name,
						servings: formatRecipeServings(command.servings),
						note: command.note,
						sourceUrl: command.sourceUrl,
						visibility: command.visibility,
						unlistedPassphrase: command.passphraseCipher ?? null,
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
					command.links,
				);

				return { id: createdRecipe.id, publicId: createdRecipe.publicId };
			});
		},

		async update(publicId, command) {
			validateIds(command);

			return db.transaction(async (transaction) => {
				const [existing] = await transaction
					.select({ id: recipe.id })
					.from(recipe)
					.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

				if (!existing) return null;

				await transaction
					.update(recipe)
					.set({
						name: command.name,
						servings: formatRecipeServings(command.servings),
						note: command.note,
						sourceUrl: command.sourceUrl,
						visibility: command.visibility,
						// undefined は、いまのまま。変えるときは、これまでに開けた人の記録を消す。
						...(command.passphraseCipher === undefined
							? {}
							: { unlistedPassphrase: command.passphraseCipher }),
					})
					.where(eq(recipe.id, existing.id));

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
				await replaceRecipeLinks(
					transaction,
					userId,
					existing.id,
					command.links,
				);

				return { publicId };
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

		async list() {
			const rows = await db
				.select({
					publicId: recipe.publicId,
					name: recipe.name,
					servings: recipe.servings,
					createdAt: recipe.createdAt,
				})
				.from(recipe)
				.where(eq(recipe.userId, userId))
				.orderBy(desc(recipe.createdAt));

			return rows.map((row) => ({
				publicId: row.publicId,
				name: row.name,
				servings: Number(row.servings),
				createdAt: row.createdAt.toISOString(),
			}));
		},
	};
}
