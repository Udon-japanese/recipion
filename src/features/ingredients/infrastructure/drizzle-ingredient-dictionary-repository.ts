import { and, asc, eq, isNull } from "drizzle-orm";
import * as v from "valibot";
import type { DB } from "#/db/client";
import { isUniqueViolation } from "#/db/is-unique-violation";
import { UserFacingError } from "#/errors/user-facing-error";
import { createIngredientRegistration } from "#/features/inventory/application/create-ingredient-registration";
import { inventoryUnitCodeSchema } from "#/features/inventory/domain/inventory-unit";
import { inventoryItem } from "#/features/inventory/infrastructure/inventory.sql";
import type { IngredientDictionaryRepository } from "../application/ingredient-dictionary-repository";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "../domain/ingredient-catalog";
import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";
import {
	formatIngredientName,
	normalizeIngredientName,
} from "../domain/normalize-ingredient-name";
import { ingredient, ingredientAlias } from "./ingredient.sql";

const takenMessage =
	"同じ名前か呼び名が、もう使われています。画面を読み込み直してください";

function rethrowUniqueViolation(error: unknown): never {
	if (
		isUniqueViolation(error, "ingredient_alias_user_normalized_name_unique")
	) {
		throw new UserFacingError(takenMessage);
	}

	throw error;
}

export function createDrizzleIngredientDictionaryRepository(
	db: DB,
	userId: string,
): IngredientDictionaryRepository {
	return {
		async list() {
			const [ingredients, aliases, items] = await Promise.all([
				db
					.select({ id: ingredient.id, name: ingredient.name })
					.from(ingredient)
					.where(
						and(eq(ingredient.userId, userId), isNull(ingredient.archivedAt)),
					)
					.orderBy(asc(ingredient.name)),
				db
					.select({
						ingredientId: ingredientAlias.ingredientId,
						name: ingredientAlias.name,
						isPrimary: ingredientAlias.isPrimary,
					})
					.from(ingredientAlias)
					.where(eq(ingredientAlias.userId, userId))
					.orderBy(asc(ingredientAlias.createdAt)),
				db
					.select({
						ingredientId: inventoryItem.ingredientId,
						sourceRecipeId: inventoryItem.sourceRecipeId,
					})
					.from(inventoryItem)
					.where(eq(inventoryItem.userId, userId)),
			]);

			const madeRecipeIngredientIds = new Set(
				items
					.filter((item) => item.sourceRecipeId !== null)
					.map((item) => item.ingredientId),
			);
			const stockedIngredientIds = new Set(
				items.map((item) => item.ingredientId),
			);

			return ingredients
				.filter((row) => !madeRecipeIngredientIds.has(row.id))
				.map(
					(row): IngredientDictionaryEntry => ({
						id: row.id,
						name: row.name,
						aliases: aliases
							.filter(
								(alias) => alias.ingredientId === row.id && !alias.isPrimary,
							)
							.map((alias) => alias.name),
						hasInventory: stockedIngredientIds.has(row.id),
					}),
				);
		},

		async create(name) {
			const catalogEntry = findIngredientCatalogEntry(name);
			// 在庫の単位は、カタログの初期値（カタログにない食材は g）。在庫に登録するときに変えられる。
			const stockUnitCode = v.parse(
				inventoryUnitCodeSchema,
				catalogEntry?.stockUnitCode ?? "g",
			);
			const registration = createIngredientRegistration({
				ingredientName: name,
				stockUnitCode,
				stockUnitLabel: catalogEntry
					? getDefaultStockUnitLabel(catalogEntry.stockUnitCode)
					: "g",
			});

			try {
				await db.transaction(async (transaction) => {
					const [created] = await transaction
						.insert(ingredient)
						.values({
							userId,
							name: registration.name,
							stockUnitCode: registration.stockUnitCode,
							stockUnitLabel: registration.stockUnitLabel,
						})
						.returning({ id: ingredient.id });

					if (!created) {
						throw new Error("材料を作成できませんでした");
					}

					await transaction.insert(ingredientAlias).values(
						registration.aliases.map((alias) => ({
							userId,
							ingredientId: created.id,
							name: alias.name,
							normalizedName: alias.normalizedName,
							isPrimary: alias.isPrimary,
						})),
					);
				});
			} catch (error) {
				rethrowUniqueViolation(error);
			}
		},

		async rename(ingredientId, name) {
			const formattedName = formatIngredientName(name);
			const normalizedName = normalizeIngredientName(formattedName);

			try {
				await db.transaction(async (transaction) => {
					// 自分の呼び名を名前にするときは、その呼び名の行を、先に消す（代表の行と重ならないように）。
					await transaction
						.delete(ingredientAlias)
						.where(
							and(
								eq(ingredientAlias.userId, userId),
								eq(ingredientAlias.ingredientId, ingredientId),
								eq(ingredientAlias.normalizedName, normalizedName),
								eq(ingredientAlias.isPrimary, false),
							),
						);

					const updated = await transaction
						.update(ingredient)
						.set({ name: formattedName })
						.where(
							and(
								eq(ingredient.id, ingredientId),
								eq(ingredient.userId, userId),
							),
						)
						.returning({ id: ingredient.id });

					if (updated.length === 0) {
						throw new UserFacingError("材料が見つかりません");
					}

					await transaction
						.update(ingredientAlias)
						.set({ name: formattedName, normalizedName })
						.where(
							and(
								eq(ingredientAlias.userId, userId),
								eq(ingredientAlias.ingredientId, ingredientId),
								eq(ingredientAlias.isPrimary, true),
							),
						);
				});
			} catch (error) {
				rethrowUniqueViolation(error);
			}
		},

		async addAlias(ingredientId, alias) {
			const formattedName = formatIngredientName(alias);

			try {
				await db.insert(ingredientAlias).values({
					userId,
					ingredientId,
					name: formattedName,
					normalizedName: normalizeIngredientName(formattedName),
					isPrimary: false,
				});
			} catch (error) {
				rethrowUniqueViolation(error);
			}
		},

		async removeAlias(ingredientId, alias) {
			await db
				.delete(ingredientAlias)
				.where(
					and(
						eq(ingredientAlias.userId, userId),
						eq(ingredientAlias.ingredientId, ingredientId),
						eq(ingredientAlias.normalizedName, normalizeIngredientName(alias)),
						eq(ingredientAlias.isPrimary, false),
					),
				);
		},

		async remove(ingredientId) {
			// 在庫（inventory_item）が残っていれば、外部キー（restrict）で消えない。呼び名は、連鎖で消える。
			const [stocked] = await db
				.select({ id: inventoryItem.id })
				.from(inventoryItem)
				.where(
					and(
						eq(inventoryItem.userId, userId),
						eq(inventoryItem.ingredientId, ingredientId),
					),
				)
				.limit(1);

			if (stocked) {
				throw new UserFacingError(
					"在庫にあるため消せません。先に在庫から消してください",
				);
			}

			await db
				.delete(ingredient)
				.where(
					and(eq(ingredient.id, ingredientId), eq(ingredient.userId, userId)),
				);
		},
	};
}
