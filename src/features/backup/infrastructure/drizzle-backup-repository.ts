import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DB } from "#/db/client";
import { isUniqueViolation } from "#/db/is-unique-violation";
import {
	ingredient,
	ingredientAlias,
} from "#/features/ingredients/infrastructure/ingredient.sql";
import {
	inventoryItem,
	inventoryLot,
} from "#/features/inventory/infrastructure/inventory.sql";
import type { PreparedRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import {
	canLinkToRecipe,
	parseRecipeVisibility,
} from "#/features/recipes/domain/recipe-link-permission";
import type { RecipeLinkReference } from "#/features/recipes/domain/recipe-links";
import { parseRecipeSnapshot } from "#/features/recipes/domain/recipe-snapshot";
import {
	createDrizzleRecipeRepository,
	loadRecipeDetail,
} from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import {
	recipe,
	recipeLink,
} from "#/features/recipes/infrastructure/recipe.sql";
import {
	type InventoryReplacePlan,
	planInventoryReplace,
} from "../application/plan-inventory-replace";
import type {
	BackupInventoryItem,
	BackupRecipe,
	BackupRecipeParent,
} from "../domain/backup-file";
import type { PublicIdOwner } from "../domain/plan-recipe-import";

// 1回に書き込む行の数（SQL のパラメーターの上限に、かからないように）。
const insertChunkSize = 500;

function chunk<T>(rows: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < rows.length; index += size) {
		chunks.push(rows.slice(index, index + size));
	}

	return chunks;
}

function toNumeric(value: number): string {
	return value.toFixed(6);
}

export function createDrizzleBackupRepository(db: DB, userId: string) {
	if (userId.trim().length === 0) {
		throw new Error("ユーザーIDを指定してください");
	}

	return {
		// 自分のレシピを、登録した順に、ページに分けて読む。
		async listRecipes(offset: number, limit: number): Promise<BackupRecipe[]> {
			const rows = await db
				.select()
				.from(recipe)
				.where(eq(recipe.userId, userId))
				.orderBy(asc(recipe.createdAt), asc(recipe.id))
				.offset(offset)
				.limit(limit);
			// 継承したレシピの、親の公開 ID（親がもうなければ、なし）。
			const parentIds = rows.flatMap((row) =>
				row.parentRecipeId === null ? [] : [row.parentRecipeId],
			);
			const parents =
				parentIds.length === 0
					? []
					: await db
							.select({ id: recipe.id, publicId: recipe.publicId })
							.from(recipe)
							.where(inArray(recipe.id, parentIds));
			const parentPublicIdById = new Map(
				parents.map((parent) => [parent.id, parent.publicId]),
			);

			return Promise.all(
				rows.map(async (row): Promise<BackupRecipe> => {
					const { publicId, author, linkViews, ...content } =
						await loadRecipeDetail(db, row, userId);
					const snapshot = parseRecipeSnapshot(row.parentSnapshot);

					return {
						publicId,
						createdAt: row.createdAt.toISOString(),
						content,
						...(snapshot
							? {
									parent: {
										publicId:
											row.parentRecipeId === null
												? null
												: (parentPublicIdById.get(row.parentRecipeId) ?? null),
										snapshot,
									},
								}
							: {}),
					};
				}),
			);
		},

		async countRecipes(): Promise<number> {
			const [owned] = await db
				.select({ total: count() })
				.from(recipe)
				.where(eq(recipe.userId, userId));

			return owned?.total ?? 0;
		},

		// 公開 ID の持ち主（自分・他の人・なし）。
		async findPublicIdOwners(
			publicIds: readonly string[],
		): Promise<Map<string, PublicIdOwner>> {
			const owners = new Map<string, PublicIdOwner>(
				publicIds.map((publicId) => [publicId, null]),
			);

			if (publicIds.length === 0) {
				return owners;
			}

			const rows = await db
				.select({ publicId: recipe.publicId, ownerUserId: recipe.userId })
				.from(recipe)
				.where(inArray(recipe.publicId, [...publicIds]));

			for (const row of rows) {
				owners.set(row.publicId, row.ownerUserId === userId ? "self" : "other");
			}

			return owners;
		},

		// 自分のレシピのうち、リンクが1つ以上あるものの公開 ID。
		async findPublicIdsWithLinks(
			publicIds: readonly string[],
		): Promise<Set<string>> {
			if (publicIds.length === 0) {
				return new Set();
			}

			const rows = await db
				.selectDistinct({ publicId: recipe.publicId })
				.from(recipe)
				.innerJoin(recipeLink, eq(recipeLink.recipeId, recipe.id))
				.where(
					and(
						eq(recipe.userId, userId),
						inArray(recipe.publicId, [...publicIds]),
					),
				);

			return new Set(rows.map((row) => row.publicId));
		},

		// レシピを作る。決めた公開 ID が、ちょうど他の人に使われたときは、新しい ID で作り直す。
		async createRecipe(
			prepared: PreparedRecipeForStorage,
			publicId: string | null,
		): Promise<{ publicId: string }> {
			const create = (id: string) =>
				createDrizzleRecipeRepository(db, userId, () => id).create(prepared);

			if (publicId === null) {
				return create(nanoid());
			}

			try {
				return await create(publicId);
			} catch (error) {
				if (!isUniqueViolation(error, "recipe_public_id_unique")) {
					throw error;
				}

				return create(nanoid());
			}
		},

		// 自分のレシピのリンクを、付けられるものだけで置き換える（見つからない・リンクできない相手は、捨てる）。
		// 本文の [[ラベル]] は残るので、捨てたリンクは「見つからないレシピ」と表示される。
		// 読み込んだレシピに、もとにしたレシピを付け直す（自分のレシピだけ）。
		// 親に付けられるのは、自分のレシピか、全体公開のレシピ（「もとにして作る」と同じ）。付けられなければ、
		// 親なし・写しありにする（「（見つからないレシピ）をもとに」と表示される）。付けたら true。
		async attachRecipeParent(
			publicId: string,
			parent: BackupRecipeParent,
		): Promise<boolean> {
			const [owned] = await db
				.select({ id: recipe.id })
				.from(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

			if (!owned) {
				return false;
			}

			const [found] =
				parent.publicId === null
					? []
					: await db
							.select({
								id: recipe.id,
								userId: recipe.userId,
								visibility: recipe.visibility,
							})
							.from(recipe)
							.where(eq(recipe.publicId, parent.publicId))
							.limit(1);
			const parentRecipeId =
				found &&
				found.id !== owned.id &&
				(found.userId === userId ||
					parseRecipeVisibility(found.visibility) === "public")
					? found.id
					: null;

			await db
				.update(recipe)
				.set({
					parentRecipeId,
					parentSnapshot: parent.snapshot,
					// 中身は変えないので、更新日時（画面の「更新」と、同時編集の版）は、そのまま。
					updatedAt: sql`${recipe.updatedAt}`,
				})
				.where(eq(recipe.id, owned.id));

			return parentRecipeId !== null;
		},

		async replaceRecipeLinks(
			publicId: string,
			links: readonly RecipeLinkReference[],
		): Promise<{ kept: number; dropped: number } | null> {
			return db.transaction(async (transaction) => {
				const [owned] = await transaction
					.select({ id: recipe.id })
					.from(recipe)
					.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

				if (!owned) {
					return null;
				}

				const targets =
					links.length === 0
						? []
						: await transaction
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
				const rows = links.flatMap((link) => {
					const target = targetByPublicId.get(link.targetPublicId);

					if (
						!target ||
						target.id === owned.id ||
						!canLinkToRecipe(userId, {
							ownerUserId: target.ownerUserId,
							visibility: parseRecipeVisibility(target.visibility),
						})
					) {
						return [];
					}

					return [
						{
							recipeId: owned.id,
							userId,
							label: link.label,
							targetRecipeId: target.id,
						},
					];
				});

				await transaction
					.delete(recipeLink)
					.where(eq(recipeLink.recipeId, owned.id));

				if (rows.length > 0) {
					await transaction.insert(recipeLink).values(rows);
				}

				return { kept: rows.length, dropped: links.length - rows.length };
			});
		},

		// 在庫を、ファイルの内容に置き換える（1つのトランザクション。途中で失敗したら、元の在庫のまま）。
		// 食材（名前・別名）は消さずに使い回す。履歴は、品目と一緒に消える。
		async replaceInventory(
			items: readonly BackupInventoryItem[],
		): Promise<{ items: number; lots: number }> {
			return db.transaction(async (transaction) => {
				// 同じ人の在庫の置き換えを、同時に走らせない。
				await transaction.execute(
					sql`select pg_advisory_xact_lock(hashtext(${`${userId}:inventory-replace`}))`,
				);

				const [aliases, recipes] = await Promise.all([
					transaction
						.select({
							normalizedName: ingredientAlias.normalizedName,
							ingredientId: ingredientAlias.ingredientId,
						})
						.from(ingredientAlias)
						.where(eq(ingredientAlias.userId, userId)),
					transaction
						.select({ id: recipe.id, publicId: recipe.publicId })
						.from(recipe)
						.where(eq(recipe.userId, userId)),
				]);
				const plan = planInventoryReplace(items, {
					ingredientIdByAlias: new Map(
						aliases.map((alias) => [alias.normalizedName, alias.ingredientId]),
					),
					recipeIdByPublicId: new Map(
						recipes.map((row) => [row.publicId, row.id]),
					),
				});

				await transaction
					.delete(inventoryItem)
					.where(eq(inventoryItem.userId, userId));
				await writeInventoryPlan(transaction, userId, plan);

				return { items: plan.items.length, lots: plan.lots.length };
			});
		},
	};
}

type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];

async function writeInventoryPlan(
	transaction: Transaction,
	userId: string,
	plan: InventoryReplacePlan,
): Promise<void> {
	for (const rows of chunk(plan.createIngredients, insertChunkSize)) {
		await transaction.insert(ingredient).values(
			rows.map((row) => ({
				id: row.id,
				userId,
				name: row.name,
				stockUnitCode: row.stockUnitCode,
				stockUnitLabel: row.stockUnitLabel,
				defaultExpiryKind: row.defaultExpiryKind,
				defaultStorage: row.defaultStorage,
			})),
		);
	}

	const aliasRows = plan.createIngredients.flatMap((row) =>
		row.aliases.map((alias) => ({
			userId,
			ingredientId: row.id,
			name: alias.name,
			normalizedName: alias.normalizedName,
			isPrimary: alias.isPrimary,
		})),
	);

	for (const rows of chunk(aliasRows, insertChunkSize)) {
		await transaction.insert(ingredientAlias).values(rows);
	}

	for (const row of plan.updateIngredients) {
		await transaction
			.update(ingredient)
			.set({
				stockUnitCode: row.stockUnitCode,
				stockUnitLabel: row.stockUnitLabel,
				defaultExpiryKind: row.defaultExpiryKind,
				defaultStorage: row.defaultStorage,
				archivedAt: null,
			})
			.where(and(eq(ingredient.id, row.id), eq(ingredient.userId, userId)));
	}

	for (const rows of chunk(plan.items, insertChunkSize)) {
		await transaction.insert(inventoryItem).values(
			rows.map((row) => ({
				id: row.id,
				userId,
				ingredientId: row.ingredientId,
				trackingMode: row.trackingMode,
				displayName: row.displayName,
				art: row.art,
				sourceRecipeId: row.sourceRecipeId,
			})),
		);
	}

	for (const rows of chunk(plan.lots, insertChunkSize)) {
		await transaction.insert(inventoryLot).values(
			rows.map((row) => ({
				id: row.id,
				userId,
				inventoryItemId: row.inventoryItemId,
				quantity: toNumeric(row.quantity),
				acquiredOn: row.acquiredOn,
				storage: row.storage,
				expiresOn: row.expiresOn,
				expiryKind: row.expiryKind,
				expirySource: row.expirySource,
				purchaseUnitLabel: row.purchaseUnit?.label ?? null,
				purchaseUnitQuantity: row.purchaseUnit
					? toNumeric(row.purchaseUnit.quantity)
					: null,
				purchaseUnitQuantityLabel: row.purchaseUnit?.quantityUnitLabel ?? null,
			})),
		);
	}
}
