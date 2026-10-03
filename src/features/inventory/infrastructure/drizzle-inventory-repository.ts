import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import * as v from "valibot";

import type { DB } from "#/db/client";
import {
	ingredient,
	ingredientAlias,
} from "#/features/ingredients/infrastructure/ingredient.sql";

import { createIngredientRegistration } from "../application/create-ingredient-registration";
import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepository,
} from "../application/inventory-adjustment-repository";
import type {
	InventoryItemResolver,
	ResolveOrCreateInventoryItemCommand,
} from "../application/inventory-item-resolver";
import type { InventoryQueryRepository } from "../application/inventory-query-repository";
import {
	applyInventoryAdjustment,
	type InventoryTrackingMode,
} from "../domain/apply-inventory-adjustment";
import {
	type InventoryUnitCode,
	inventoryUnitCodeSchema,
} from "../domain/inventory-unit";
import { inventoryItem, inventoryTransaction } from "./inventory.sql";

function parseTrackingMode(value: string): InventoryTrackingMode {
	if (value === "exact" || value === "estimated") {
		return value;
	}

	throw new Error(`未対応の在庫管理方式です: ${value}`);
}

function parseInventoryUnitCode(value: string): InventoryUnitCode {
	return v.parse(inventoryUnitCodeSchema, value);
}

function toNumeric(value: number): string {
	return value.toFixed(6);
}

export function createDrizzleInventoryRepository(
	db: DB,
	userId: string,
): InventoryAdjustmentRepository &
	InventoryItemResolver &
	InventoryQueryRepository {
	if (userId.trim().length === 0) {
		throw new Error("ユーザーIDを指定してください");
	}

	return {
		async list() {
			const rows = await db
				.select({
					inventoryItemId: inventoryItem.id,
					ingredientId: ingredient.id,
					name: ingredient.name,
					quantity: inventoryItem.quantity,
					stockUnitCode: ingredient.stockUnitCode,
					stockUnitLabel: ingredient.stockUnitLabel,
					trackingMode: inventoryItem.trackingMode,
					updatedAt: inventoryItem.updatedAt,
				})
				.from(inventoryItem)
				.innerJoin(
					ingredient,
					and(
						eq(ingredient.id, inventoryItem.ingredientId),
						eq(ingredient.userId, inventoryItem.userId),
					),
				)
				.where(
					and(
						eq(inventoryItem.userId, userId),
						isNull(inventoryItem.archivedAt),
						isNull(ingredient.archivedAt),
					),
				)
				.orderBy(asc(ingredient.name));

			return rows.map((row) => ({
				inventoryItemId: row.inventoryItemId,
				ingredientId: row.ingredientId,
				name: row.name,
				quantity: Number(row.quantity),
				stockUnitCode: parseInventoryUnitCode(row.stockUnitCode),
				stockUnitLabel: row.stockUnitLabel,
				trackingMode: parseTrackingMode(row.trackingMode),
				updatedAt: row.updatedAt.toISOString(),
			}));
		},

		async resolveOrCreateInventoryItem(
			command: ResolveOrCreateInventoryItemCommand,
		) {
			const registration = createIngredientRegistration(command);

			const primaryAlias = registration.aliases.find(
				(alias) => alias.isPrimary,
			);

			if (!primaryAlias) {
				throw new Error("食材の主別名がありません");
			}

			return db.transaction(async (transaction) => {
				/*
				 * 同じユーザー・同じ標準食材を同時に作成する処理を
				 * PostgreSQL内で直列化する。
				 */
				const lockKey = `${userId}:${primaryAlias.normalizedName}`;

				await transaction.execute(
					sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`,
				);

				const matchingAliases = await transaction
					.select({
						ingredientId: ingredientAlias.ingredientId,
					})
					.from(ingredientAlias)
					.where(
						and(
							eq(ingredientAlias.userId, userId),
							inArray(
								ingredientAlias.normalizedName,
								registration.aliases.map((alias) => alias.normalizedName),
							),
						),
					);

				const matchingIngredientIds = [
					...new Set(matchingAliases.map((alias) => alias.ingredientId)),
				];

				if (matchingIngredientIds.length > 1) {
					throw new Error("食材の別名が複数の食材に登録されています");
				}

				let storedIngredient:
					| {
							id: string;
							name: string;
							stockUnitCode: string;
							stockUnitLabel: string;
					  }
					| undefined;

				const existingIngredientId = matchingIngredientIds[0];

				if (existingIngredientId) {
					[storedIngredient] = await transaction
						.select({
							id: ingredient.id,
							name: ingredient.name,
							stockUnitCode: ingredient.stockUnitCode,
							stockUnitLabel: ingredient.stockUnitLabel,
						})
						.from(ingredient)
						.where(
							and(
								eq(ingredient.id, existingIngredientId),
								eq(ingredient.userId, userId),
							),
						)
						.limit(1);

					if (storedIngredient) {
						await transaction
							.update(ingredient)
							.set({
								archivedAt: null,
							})
							.where(
								and(
									eq(ingredient.id, storedIngredient.id),
									eq(ingredient.userId, userId),
								),
							);
					}
				} else {
					[storedIngredient] = await transaction
						.insert(ingredient)
						.values({
							userId,
							name: registration.name,
							stockUnitCode: registration.stockUnitCode,
							stockUnitLabel: registration.stockUnitLabel,
						})
						.returning({
							id: ingredient.id,
							name: ingredient.name,
							stockUnitCode: ingredient.stockUnitCode,
							stockUnitLabel: ingredient.stockUnitLabel,
						});

					if (!storedIngredient) {
						throw new Error("食材を作成できませんでした");
					}

					const createdIngredientId = storedIngredient.id;

					await transaction.insert(ingredientAlias).values(
						registration.aliases.map((alias) => ({
							userId,
							ingredientId: createdIngredientId,
							name: alias.name,
							normalizedName: alias.normalizedName,
							isPrimary: alias.isPrimary,
						})),
					);
				}

				if (!storedIngredient) {
					throw new Error("食材が見つかりません");
				}

				const [existingInventoryItem] = await transaction
					.select({
						id: inventoryItem.id,
						trackingMode: inventoryItem.trackingMode,
					})
					.from(inventoryItem)
					.where(
						and(
							eq(inventoryItem.userId, userId),
							eq(inventoryItem.ingredientId, storedIngredient.id),
						),
					)
					.limit(1);

				let resolvedInventoryItem = existingInventoryItem;

				if (existingInventoryItem) {
					await transaction
						.update(inventoryItem)
						.set({
							archivedAt: null,
						})
						.where(
							and(
								eq(inventoryItem.id, existingInventoryItem.id),
								eq(inventoryItem.userId, userId),
							),
						);
				} else {
					[resolvedInventoryItem] = await transaction
						.insert(inventoryItem)
						.values({
							userId,
							ingredientId: storedIngredient.id,
							trackingMode: registration.defaultTrackingMode,
						})
						.returning({
							id: inventoryItem.id,
							trackingMode: inventoryItem.trackingMode,
						});
				}

				if (!resolvedInventoryItem) {
					throw new Error("在庫項目を作成できませんでした");
				}

				return {
					ingredientId: storedIngredient.id,
					inventoryItemId: resolvedInventoryItem.id,
					name: storedIngredient.name,
					stockUnitCode: parseInventoryUnitCode(storedIngredient.stockUnitCode),
					stockUnitLabel: storedIngredient.stockUnitLabel,
					trackingMode: parseTrackingMode(resolvedInventoryItem.trackingMode),
				};
			});
		},
		async applyAdjustment(command: InventoryAdjustmentCommand) {
			return db.transaction(async (transaction) => {
				const [existingTransaction] = await transaction
					.select({
						id: inventoryTransaction.id,
						inventoryItemId: inventoryTransaction.inventoryItemId,
						resultingQuantity: inventoryTransaction.resultingQuantity,
					})
					.from(inventoryTransaction)
					.where(
						and(
							eq(inventoryTransaction.id, command.transactionId),
							eq(inventoryTransaction.userId, userId),
						),
					)
					.limit(1);

				if (existingTransaction) {
					if (existingTransaction.inventoryItemId !== command.inventoryItemId) {
						throw new Error("取引IDが別の在庫操作ですでに使用されています");
					}

					return {
						status: "already-applied" as const,
						transactionId: existingTransaction.id,
						quantity: Number(existingTransaction.resultingQuantity),
					};
				}

				const [storedInventoryItem] = await transaction
					.select({
						id: inventoryItem.id,
						quantity: inventoryItem.quantity,
						trackingMode: inventoryItem.trackingMode,
						stockUnitCode: ingredient.stockUnitCode,
					})
					.from(inventoryItem)
					.innerJoin(
						ingredient,
						and(
							eq(ingredient.id, inventoryItem.ingredientId),
							eq(ingredient.userId, inventoryItem.userId),
						),
					)
					.where(
						and(
							eq(inventoryItem.id, command.inventoryItemId),
							eq(inventoryItem.userId, userId),
						),
					)
					.for("update")
					.limit(1);

				if (!storedInventoryItem) {
					throw new Error("在庫項目が見つかりません");
				}

				/*
				 * 同一取引が並行して届いた場合に備え、
				 * 在庫行のロック取得後にもう一度確認する。
				 */
				const [concurrentTransaction] = await transaction
					.select({
						id: inventoryTransaction.id,
						inventoryItemId: inventoryTransaction.inventoryItemId,
						resultingQuantity: inventoryTransaction.resultingQuantity,
					})
					.from(inventoryTransaction)
					.where(
						and(
							eq(inventoryTransaction.id, command.transactionId),
							eq(inventoryTransaction.userId, userId),
						),
					)
					.limit(1);

				if (concurrentTransaction) {
					if (
						concurrentTransaction.inventoryItemId !== command.inventoryItemId
					) {
						throw new Error("取引IDが別の在庫操作ですでに使用されています");
					}
					return {
						status: "already-applied" as const,
						transactionId: concurrentTransaction.id,
						quantity: Number(concurrentTransaction.resultingQuantity),
					};
				}

				const result = applyInventoryAdjustment({
					...command,
					currentQuantity: Number(storedInventoryItem.quantity),
					trackingMode: parseTrackingMode(storedInventoryItem.trackingMode),
					stockUnitCode: storedInventoryItem.stockUnitCode,
				});

				await transaction
					.update(inventoryItem)
					.set({
						quantity: toNumeric(result.quantity),
					})
					.where(
						and(
							eq(inventoryItem.id, storedInventoryItem.id),
							eq(inventoryItem.userId, userId),
						),
					);

				await transaction.insert(inventoryTransaction).values({
					id: result.transaction.id,
					userId,
					inventoryItemId: result.transaction.inventoryItemId,
					inputQuantity: toNumeric(result.transaction.inputQuantity),
					inputUnitCode: result.transaction.inputUnitCode,
					requestedQuantityDelta: toNumeric(
						result.transaction.requestedQuantityDelta,
					),
					quantityDelta: toNumeric(result.transaction.quantityDelta),
					resultingQuantity: toNumeric(result.transaction.resultingQuantity),
					stockUnitCode: result.transaction.stockUnitCode,
					reason: result.transaction.reason,
					sourceType: result.transaction.sourceType,
					sourceId: result.transaction.sourceId,
					occurredAt: new Date(result.transaction.occurredAt),
				});

				return {
					status: "applied" as const,
					transactionId: result.transaction.id,
					quantity: result.quantity,
				};
			});
		},
	};
}
