import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import * as v from "valibot";

import type { DB } from "#/db/client";
import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import {
	ingredient,
	ingredientAlias,
} from "#/features/ingredients/infrastructure/ingredient.sql";
import { createIngredientRegistration } from "../application/create-ingredient-registration";
import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepository,
	RecipeConsumptionUndoRepository,
} from "../application/inventory-adjustment-repository";
import type {
	ChangeStockUnitCommand,
	InventoryItemManagementRepository,
	RenameInventoryItemCommand,
} from "../application/inventory-item-management-repository";
import type {
	InventoryItemResolver,
	ResolveOrCreateInventoryItemCommand,
} from "../application/inventory-item-resolver";
import type {
	InventoryLotRepository,
	SetLotQuantityCommand,
	UpdateInventoryLotCommand,
} from "../application/inventory-lot-repository";
import type { InventoryQueryRepository } from "../application/inventory-query-repository";
import type {
	ChangeInventoryTrackingModeCommand,
	InventoryTrackingModeRepository,
} from "../application/inventory-tracking-mode-repository";
import {
	applyInventoryAdjustment,
	type InventoryTrackingMode,
} from "../domain/apply-inventory-adjustment";
import { convertInventoryQuantity } from "../domain/convert-inventory-quantity";
import {
	allocateDecrease,
	findMergeableLot,
	type InventoryExpiryKind,
	type InventoryExpirySource,
	type InventoryLot,
	type InventoryStorage,
	resolveLotConditions,
	sortLotsForConsumption,
	sumLotQuantities,
	toDateString,
	validateManualAllocations,
} from "../domain/inventory-lot";
import {
	inventoryTrackingModes,
	presenceLotQuantity,
} from "../domain/inventory-tracking-mode";
import {
	type InventoryUnitCode,
	inventoryUnitCodeSchema,
} from "../domain/inventory-unit";
import { planStockUnitChange } from "../domain/plan-stock-unit-change";
import {
	inventoryItem,
	inventoryLot,
	inventoryTransaction,
} from "./inventory.sql";

function parseTrackingMode(value: string): InventoryTrackingMode {
	const matched = inventoryTrackingModes.find((mode) => mode === value);

	if (matched) {
		return matched;
	}

	throw new Error(`未対応の在庫管理方式です: ${value}`);
}

function parseInventoryUnitCode(value: string): InventoryUnitCode {
	return v.parse(inventoryUnitCodeSchema, value);
}

function toNumeric(value: number): string {
	return value.toFixed(6);
}

function parseOptionalValue<T extends string>(
	value: string | null,
	allowedValues: readonly T[],
	label: string,
): T | null {
	if (value === null) {
		return null;
	}

	const matched = allowedValues.find((allowedValue) => allowedValue === value);

	if (matched === undefined) {
		throw new Error(`未対応の${label}です: ${value}`);
	}

	return matched;
}

function toInventoryLot(row: typeof inventoryLot.$inferSelect): InventoryLot {
	return {
		id: row.id,
		quantity: Number(row.quantity),
		acquiredOn: row.acquiredOn,
		storage: parseOptionalValue<InventoryStorage>(
			row.storage,
			["room", "fridge", "freezer"],
			"保存方法",
		),
		expiresOn: row.expiresOn,
		expiryKind: parseOptionalValue<InventoryExpiryKind>(
			row.expiryKind,
			["use-by", "best-before", "none"],
			"期限の種類",
		),
		expirySource: parseOptionalValue<InventoryExpirySource>(
			row.expirySource,
			["entered", "estimated"],
			"期限の出所",
		),
		createdAt: row.createdAt.toISOString(),
	};
}

// トランザクションの中でも、通常の接続でも使える、ロットの取得。
type DbOrTransaction = Pick<DB, "select">;

async function loadLots(
	executor: DbOrTransaction,
	userId: string,
	inventoryItemId: string,
): Promise<InventoryLot[]> {
	const rows = await executor
		.select()
		.from(inventoryLot)
		.where(
			and(
				eq(inventoryLot.userId, userId),
				eq(inventoryLot.inventoryItemId, inventoryItemId),
			),
		);

	return rows.map(toInventoryLot);
}

// 満タンの量（これまでの合計の最大値）を、いまのロットの合計まで引き上げる。数量を変えた操作の最後に呼ぶ。
async function raiseCapacity(
	executor: Pick<DB, "update">,
	userId: string,
	inventoryItemId: string,
) {
	await executor
		.update(inventoryItem)
		.set({
			capacity: sql`greatest(${inventoryItem.capacity}, coalesce((select sum(${inventoryLot.quantity}) from ${inventoryLot} where ${inventoryLot.inventoryItemId} = ${inventoryItem.id}), 0))`,
		})
		.where(
			and(
				eq(inventoryItem.id, inventoryItemId),
				eq(inventoryItem.userId, userId),
			),
		);
}

function toStockedLots(lots: readonly InventoryLot[]): InventoryLot[] {
	return sortLotsForConsumption(lots.filter((lot) => lot.quantity > 0));
}

export function createDrizzleInventoryRepository(
	db: DB,
	userId: string,
): InventoryAdjustmentRepository &
	RecipeConsumptionUndoRepository &
	InventoryTrackingModeRepository &
	InventoryItemManagementRepository &
	InventoryItemResolver &
	InventoryLotRepository &
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
					displayName: inventoryItem.displayName,
					stockUnitCode: ingredient.stockUnitCode,
					stockUnitLabel: ingredient.stockUnitLabel,
					defaultExpiryKind: ingredient.defaultExpiryKind,
					defaultStorage: ingredient.defaultStorage,
					trackingMode: inventoryItem.trackingMode,
					capacity: inventoryItem.capacity,
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

			// 在庫のあるロットだけを、まとめて取得する。
			const lotRows = await db
				.select()
				.from(inventoryLot)
				.where(
					and(
						eq(inventoryLot.userId, userId),
						sql`${inventoryLot.quantity} > 0`,
					),
				);

			const lotsByItemId = new Map<string, InventoryLot[]>();
			const lotUpdatedAtByItemId = new Map<string, Date>();

			for (const lotRow of lotRows) {
				const lots = lotsByItemId.get(lotRow.inventoryItemId) ?? [];

				lots.push(toInventoryLot(lotRow));
				lotsByItemId.set(lotRow.inventoryItemId, lots);

				const latest = lotUpdatedAtByItemId.get(lotRow.inventoryItemId);

				if (!latest || latest < lotRow.updatedAt) {
					lotUpdatedAtByItemId.set(lotRow.inventoryItemId, lotRow.updatedAt);
				}
			}

			return rows.map((row) => {
				const lots = sortLotsForConsumption(
					lotsByItemId.get(row.inventoryItemId) ?? [],
				);
				const lotUpdatedAt = lotUpdatedAtByItemId.get(row.inventoryItemId);
				const updatedAt =
					lotUpdatedAt && lotUpdatedAt > row.updatedAt
						? lotUpdatedAt
						: row.updatedAt;

				return {
					inventoryItemId: row.inventoryItemId,
					ingredientId: row.ingredientId,
					name: row.name,
					displayName: row.displayName,
					quantity: sumLotQuantities(lots),
					capacity: Number(row.capacity),
					lots,
					stockUnitCode: parseInventoryUnitCode(row.stockUnitCode),
					stockUnitLabel: row.stockUnitLabel,
					trackingMode: parseTrackingMode(row.trackingMode),
					defaultExpiryKind: parseOptionalValue<InventoryExpiryKind>(
						row.defaultExpiryKind,
						["use-by", "best-before", "none"],
						"期限の種類",
					),
					defaultStorage: parseOptionalValue<InventoryStorage>(
						row.defaultStorage,
						["room", "fridge", "freezer"],
						"保存方法",
					),
					updatedAt: updatedAt.toISOString(),
				};
			});
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

				const currentLots = await loadLots(
					transaction,
					userId,
					resolvedInventoryItem.id,
				);

				return {
					ingredientId: storedIngredient.id,
					inventoryItemId: resolvedInventoryItem.id,
					name: storedIngredient.name,
					stockUnitCode: parseInventoryUnitCode(storedIngredient.stockUnitCode),
					stockUnitLabel: storedIngredient.stockUnitLabel,
					trackingMode: parseTrackingMode(resolvedInventoryItem.trackingMode),
					quantity: sumLotQuantities(currentLots),
				};
			});
		},
		async applyAdjustment(command: InventoryAdjustmentCommand) {
			return db.transaction(async (transaction) => {
				const findExistingTransaction = async () => {
					const [existing] = await transaction
						.select({
							id: inventoryTransaction.id,
							inventoryItemId: inventoryTransaction.inventoryItemId,
						})
						.from(inventoryTransaction)
						.where(
							and(
								eq(inventoryTransaction.id, command.transactionId),
								eq(inventoryTransaction.userId, userId),
							),
						)
						.limit(1);

					return existing;
				};

				const toAlreadyApplied = async (existing: {
					id: string;
					inventoryItemId: string;
				}) => {
					if (existing.inventoryItemId !== command.inventoryItemId) {
						throw new Error("取引IDが別の在庫操作ですでに使用されています");
					}

					const lots = toStockedLots(
						await loadLots(transaction, userId, command.inventoryItemId),
					);

					return {
						status: "already-applied" as const,
						transactionId: existing.id,
						quantity: sumLotQuantities(lots),
						lots,
					};
				};

				const existingTransaction = await findExistingTransaction();

				if (existingTransaction) {
					return toAlreadyApplied(existingTransaction);
				}

				// 食材の行をロックして、同じ食材への操作を直列にする（ロットの増減は、必ず、この行のロックのあとに行う）。
				const [storedInventoryItem] = await transaction
					.select({
						id: inventoryItem.id,
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
					.for("update", { of: inventoryItem })
					.limit(1);

				if (!storedInventoryItem) {
					throw new Error("在庫項目が見つかりません");
				}

				/*
				 * 同一取引が並行して届いた場合に備え、
				 * 在庫行のロック取得後にもう一度確認する。
				 */
				const concurrentTransaction = await findExistingTransaction();

				if (concurrentTransaction) {
					return toAlreadyApplied(concurrentTransaction);
				}

				const trackingMode = parseTrackingMode(
					storedInventoryItem.trackingMode,
				);
				const stockUnitCode = storedInventoryItem.stockUnitCode;
				const allLots = await loadLots(
					transaction,
					userId,
					command.inventoryItemId,
				);

				// ロットへ、1回分の加減算を適用し、ロットの数量と履歴を保存する。
				const applyToLot = async (
					lot: InventoryLot,
					input: {
						transactionId: string;
						inputQuantity: number;
						inputUnitCode: string;
						stockQuantityPerInputUnit: number;
						operation: "increase" | "decrease";
					},
				) => {
					const result = applyInventoryAdjustment({
						transactionId: input.transactionId,
						inventoryItemId: command.inventoryItemId,
						currentQuantity: lot.quantity,
						inputQuantity: input.inputQuantity,
						inputUnitCode: input.inputUnitCode,
						stockUnitCode,
						stockQuantityPerInputUnit: input.stockQuantityPerInputUnit,
						operation: input.operation,
						reason: command.reason,
						sourceType: command.sourceType,
						sourceId: command.sourceId,
						trackingMode,
					});

					await transaction
						.update(inventoryLot)
						.set({ quantity: toNumeric(result.quantity) })
						.where(
							and(eq(inventoryLot.id, lot.id), eq(inventoryLot.userId, userId)),
						);

					await transaction.insert(inventoryTransaction).values({
						id: result.transaction.id,
						userId,
						inventoryItemId: result.transaction.inventoryItemId,
						inventoryLotId: lot.id,
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
				};

				if (command.operation === "increase") {
					// 追加：同じ条件のロットがあれば合体、なければ新しいロット。
					const conditions = resolveLotConditions(
						command.lot,
						toDateString(new Date()),
					);

					let target = findMergeableLot(allLots, conditions);

					// 有無だけの食材は、すでに「ある」（同じ条件のロットが 1 になっている）なら、何も書かない。
					const isAlreadyPresent =
						trackingMode === "presence" &&
						target !== undefined &&
						target.quantity >= presenceLotQuantity;

					if (!isAlreadyPresent && !target) {
						const [createdLot] = await transaction
							.insert(inventoryLot)
							.values({
								userId,
								inventoryItemId: command.inventoryItemId,
								quantity: toNumeric(0),
								acquiredOn: conditions.acquiredOn,
								storage: conditions.storage,
								expiresOn: conditions.expiresOn,
								expiryKind: conditions.expiryKind,
								expirySource: conditions.expirySource,
							})
							.returning();

						if (!createdLot) {
							throw new Error("ロットを作成できませんでした");
						}

						target = toInventoryLot(createdLot);
					}

					if (isAlreadyPresent) {
						// 何もしない。
					} else if (trackingMode === "presence" && target) {
						// 有無だけ：入力の量にかかわらず、ロットを「ある」（1）にする。
						await applyToLot(target, {
							transactionId: command.transactionId,
							inputQuantity: Number(
								(presenceLotQuantity - target.quantity).toFixed(6),
							),
							inputUnitCode: stockUnitCode,
							stockQuantityPerInputUnit: 1,
							operation: "increase",
						});
					} else if (target) {
						await applyToLot(target, {
							transactionId: command.transactionId,
							inputQuantity: command.inputQuantity,
							inputUnitCode: command.inputUnitCode,
							stockQuantityPerInputUnit: command.stockQuantityPerInputUnit,
							operation: "increase",
						});
					}
				} else if (trackingMode === "presence") {
					// 有無だけ：どれだけ減らすと指定されても、全ロットを「ない」（0）にする。
					const stockedLots = allLots.filter((lot) => lot.quantity > 0);

					for (const [index, lot] of stockedLots.entries()) {
						await applyToLot(lot, {
							transactionId:
								index === 0 ? command.transactionId : crypto.randomUUID(),
							inputQuantity: lot.quantity,
							inputUnitCode: stockUnitCode,
							stockQuantityPerInputUnit: 1,
							operation: "decrease",
						});
					}
				} else {
					// 減らす：ロットの指定があればそれに従い、なければ、期限の早いロットから自動で引く。
					const requestedStockQuantity = convertInventoryQuantity({
						inputQuantity: command.inputQuantity,
						inputUnitCode: command.inputUnitCode,
						stockUnitCode,
						stockQuantityPerInputUnit: command.stockQuantityPerInputUnit,
					}).quantity;

					const allocations = command.allocations
						? validateManualAllocations(
								allLots,
								command.allocations,
								trackingMode,
							)
						: allocateDecrease(allLots, requestedStockQuantity, trackingMode);

					const lotsById = new Map(allLots.map((lot) => [lot.id, lot]));

					for (const [index, allocation] of allocations.entries()) {
						const lot = lotsById.get(allocation.lotId);

						if (!lot) {
							throw new Error("ロットが見つかりません");
						}

						await applyToLot(lot, {
							// 最初の履歴の ID を、操作の取引 ID にする（再送のとき、これで二重適用を防ぐ）。
							transactionId:
								index === 0 ? command.transactionId : crypto.randomUUID(),
							inputQuantity: allocation.quantity,
							inputUnitCode: stockUnitCode,
							stockQuantityPerInputUnit: 1,
							operation: "decrease",
						});
					}
				}

				await raiseCapacity(transaction, userId, command.inventoryItemId);

				const lots = toStockedLots(
					await loadLots(transaction, userId, command.inventoryItemId),
				);

				return {
					status: "applied" as const,
					transactionId: command.transactionId,
					quantity: sumLotQuantities(lots),
					lots,
				};
			});
		},

		async undoRecipeConsumption(sourceId: string) {
			return db.transaction(async (transaction) => {
				const consumed = await transaction
					.select({
						inventoryItemId: inventoryTransaction.inventoryItemId,
						inventoryLotId: inventoryTransaction.inventoryLotId,
						quantityDelta: inventoryTransaction.quantityDelta,
						stockUnitCode: inventoryTransaction.stockUnitCode,
					})
					.from(inventoryTransaction)
					.where(
						and(
							eq(inventoryTransaction.userId, userId),
							eq(inventoryTransaction.reason, "recipe-consumption"),
							eq(inventoryTransaction.sourceId, sourceId),
						),
					);

				if (consumed.length === 0) {
					return { status: "nothing-to-undo" as const, items: [] };
				}

				// 食材の行を、順番を決めてロックする（同時に、別の操作と入れ違いにならないように）。
				const itemIds = [
					...new Set(consumed.map((row) => row.inventoryItemId)),
				].sort();

				for (const itemId of itemIds) {
					await transaction
						.select({ id: inventoryItem.id })
						.from(inventoryItem)
						.where(
							and(
								eq(inventoryItem.id, itemId),
								eq(inventoryItem.userId, userId),
							),
						)
						.for("update", { of: inventoryItem });
				}

				const loadItems = async () =>
					Promise.all(
						itemIds.map(async (inventoryItemId) => {
							const lots = toStockedLots(
								await loadLots(transaction, userId, inventoryItemId),
							);

							return {
								inventoryItemId,
								quantity: sumLotQuantities(lots),
								lots,
							};
						}),
					);

				const [alreadyUndone] = await transaction
					.select({ id: inventoryTransaction.id })
					.from(inventoryTransaction)
					.where(
						and(
							eq(inventoryTransaction.userId, userId),
							eq(inventoryTransaction.reason, "recipe-consumption-undo"),
							eq(inventoryTransaction.sourceId, sourceId),
						),
					)
					.limit(1);

				if (alreadyUndone) {
					return {
						status: "already-undone" as const,
						items: await loadItems(),
					};
				}

				const now = new Date();

				// 引いたあとで在庫の単位を変えていたら、その食材の分は、単位が違うので戻さない（数量が狂うため）。
				const currentUnits = new Map(
					(
						await transaction
							.select({
								id: inventoryItem.id,
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
									eq(inventoryItem.userId, userId),
									inArray(inventoryItem.id, itemIds),
								),
							)
					).map((row) => [row.id, row.stockUnitCode]),
				);

				for (const row of consumed) {
					if (currentUnits.get(row.inventoryItemId) !== row.stockUnitCode) {
						continue;
					}

					// ロットが消えている（引いたあとで削除された）履歴は、戻す先がないので、飛ばす。
					if (row.inventoryLotId === null) {
						continue;
					}

					const restored = Math.abs(Number(row.quantityDelta));

					if (restored === 0) {
						continue;
					}

					const [updatedLot] = await transaction
						.update(inventoryLot)
						.set({
							quantity: sql`${inventoryLot.quantity} + ${toNumeric(restored)}`,
						})
						.where(
							and(
								eq(inventoryLot.id, row.inventoryLotId),
								eq(inventoryLot.userId, userId),
							),
						)
						.returning({ quantity: inventoryLot.quantity });

					if (!updatedLot) {
						continue;
					}

					await transaction.insert(inventoryTransaction).values({
						userId,
						inventoryItemId: row.inventoryItemId,
						inventoryLotId: row.inventoryLotId,
						inputQuantity: toNumeric(restored),
						inputUnitCode: row.stockUnitCode,
						requestedQuantityDelta: toNumeric(restored),
						quantityDelta: toNumeric(restored),
						resultingQuantity: updatedLot.quantity,
						stockUnitCode: row.stockUnitCode,
						reason: "recipe-consumption-undo",
						sourceType: "recipe",
						sourceId,
						occurredAt: now,
					});
				}

				for (const itemId of itemIds) {
					await raiseCapacity(transaction, userId, itemId);
				}

				return { status: "undone" as const, items: await loadItems() };
			});
		},

		async deleteItem(inventoryItemId: string) {
			// ロットと履歴は、外部キーの連鎖で消える。食材（名前・別名）は残る。
			const deleted = await db
				.delete(inventoryItem)
				.where(
					and(
						eq(inventoryItem.id, inventoryItemId),
						eq(inventoryItem.userId, userId),
					),
				)
				.returning({ id: inventoryItem.id });

			return deleted.length > 0;
		},

		async changeStockUnit(command: ChangeStockUnitCommand) {
			return db.transaction(async (transaction) => {
				const [storedItem] = await transaction
					.select({
						id: inventoryItem.id,
						trackingMode: inventoryItem.trackingMode,
						ingredientId: ingredient.id,
						name: ingredient.name,
						stockUnitCode: ingredient.stockUnitCode,
						stockUnitLabel: ingredient.stockUnitLabel,
						capacity: inventoryItem.capacity,
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
					.for("update", { of: inventoryItem })
					.limit(1);

				if (!storedItem) {
					throw new Error("在庫項目が見つかりません");
				}

				if (parseTrackingMode(storedItem.trackingMode) === "presence") {
					throw new Error("有無だけで管理している食材は、単位を変えられません");
				}

				const allLots = await loadLots(
					transaction,
					userId,
					command.inventoryItemId,
				);
				const isSameUnit =
					storedItem.stockUnitCode === command.stockUnitCode &&
					storedItem.stockUnitLabel === command.stockUnitLabel;

				if (!isSameUnit) {
					// 古い単位の1つ分が、新しい単位でいくつか（換算できなければ null）。
					const factor = convertToStockQuantity(
						{
							quantity: 1,
							unitLabel:
								storedItem.stockUnitCode === "count"
									? storedItem.stockUnitLabel
									: storedItem.stockUnitCode,
							stockUnitCode: command.stockUnitCode,
							stockUnitLabel: command.stockUnitLabel,
						},
						findIngredientCatalogEntry(storedItem.name),
					);
					const plan = planStockUnitChange({
						lots: allLots,
						factor,
						lotQuantities: command.lotQuantities,
					});

					for (const { lotId, quantity, adjustment } of plan) {
						await transaction
							.update(inventoryLot)
							.set({ quantity: toNumeric(quantity) })
							.where(
								and(
									eq(inventoryLot.id, lotId),
									eq(inventoryLot.userId, userId),
								),
							);

						// 入力された数量が、換算した数量と食い違ったロットだけ、その差を履歴に残す（新しい単位で）。
						if (adjustment !== 0) {
							await transaction.insert(inventoryTransaction).values({
								userId,
								inventoryItemId: command.inventoryItemId,
								inventoryLotId: lotId,
								inputQuantity: toNumeric(Math.abs(adjustment)),
								inputUnitCode: command.stockUnitCode,
								requestedQuantityDelta: toNumeric(adjustment),
								quantityDelta: toNumeric(adjustment),
								resultingQuantity: toNumeric(quantity),
								stockUnitCode: command.stockUnitCode,
								reason: "manual-adjustment",
								occurredAt: new Date(),
							});
						}
					}

					await transaction
						.update(ingredient)
						.set({
							stockUnitCode: command.stockUnitCode,
							stockUnitLabel: command.stockUnitLabel,
						})
						.where(
							and(
								eq(ingredient.id, storedItem.ingredientId),
								eq(ingredient.userId, userId),
							),
						);

					// 満タンの量も、合計の変わった割合で、新しい単位に直す（合計が 0 だった場合は、作り直す）。
					const oldTotal = sumLotQuantities(allLots);
					const newTotal = plan.reduce((sum, entry) => sum + entry.quantity, 0);
					const oldCapacity = Number(storedItem.capacity);

					await transaction
						.update(inventoryItem)
						.set({
							capacity: toNumeric(
								oldTotal > 0 && oldCapacity > 0
									? (oldCapacity * newTotal) / oldTotal
									: 0,
							),
						})
						.where(
							and(
								eq(inventoryItem.id, command.inventoryItemId),
								eq(inventoryItem.userId, userId),
							),
						);
				}

				await raiseCapacity(transaction, userId, command.inventoryItemId);

				const lots = toStockedLots(
					await loadLots(transaction, userId, command.inventoryItemId),
				);

				return {
					inventoryItemId: command.inventoryItemId,
					stockUnitCode: parseInventoryUnitCode(command.stockUnitCode),
					stockUnitLabel: command.stockUnitLabel,
					quantity: sumLotQuantities(lots),
					lots,
				};
			});
		},

		async renameItem(command: RenameInventoryItemCommand) {
			const [updated] = await db
				.update(inventoryItem)
				.set({ displayName: command.displayName })
				.where(
					and(
						eq(inventoryItem.id, command.inventoryItemId),
						eq(inventoryItem.userId, userId),
					),
				)
				.returning({
					inventoryItemId: inventoryItem.id,
					displayName: inventoryItem.displayName,
				});

			if (!updated) {
				throw new Error("在庫項目が見つかりません");
			}

			return updated;
		},

		async changeTrackingMode(command: ChangeInventoryTrackingModeCommand) {
			return db.transaction(async (transaction) => {
				const [storedItem] = await transaction
					.select({
						id: inventoryItem.id,
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
					.for("update", { of: inventoryItem })
					.limit(1);

				if (!storedItem) {
					throw new Error("在庫項目が見つかりません");
				}

				const previousMode = parseTrackingMode(storedItem.trackingMode);
				const allLots = await loadLots(
					transaction,
					userId,
					command.inventoryItemId,
				);
				const stockedLots = sortLotsForConsumption(
					allLots.filter((lot) => lot.quantity > 0),
				);

				// ロットの数量を決めた値にして、その差を履歴に残す。
				const setLotQuantity = async (lot: InventoryLot, quantity: number) => {
					const delta = Number((quantity - lot.quantity).toFixed(6));

					if (delta === 0) {
						return;
					}

					await transaction
						.update(inventoryLot)
						.set({ quantity: toNumeric(quantity) })
						.where(
							and(eq(inventoryLot.id, lot.id), eq(inventoryLot.userId, userId)),
						);

					await transaction.insert(inventoryTransaction).values({
						userId,
						inventoryItemId: command.inventoryItemId,
						inventoryLotId: lot.id,
						inputQuantity: toNumeric(Math.abs(delta)),
						inputUnitCode: storedItem.stockUnitCode,
						requestedQuantityDelta: toNumeric(delta),
						quantityDelta: toNumeric(delta),
						resultingQuantity: toNumeric(quantity),
						stockUnitCode: storedItem.stockUnitCode,
						reason: "manual-adjustment",
						occurredAt: new Date(),
					});
				};

				if (previousMode !== command.trackingMode) {
					if (command.trackingMode === "presence") {
						// 数量を追うのをやめる：「ある」のロットは、すべて 1 にそろえる。
						for (const lot of stockedLots) {
							await setLotQuantity(lot, presenceLotQuantity);
						}
					} else if (previousMode === "presence") {
						// 有無だけ → 数量を追う：入れてもらった、いまの量にする（期限が最も早いロットに寄せ、他は 0 にする）。
						const quantity = command.currentQuantity ?? 0;
						const [first, ...others] = stockedLots;

						if (first) {
							await setLotQuantity(first, quantity);
						} else if (quantity > 0) {
							const [createdLot] = await transaction
								.insert(inventoryLot)
								.values({
									userId,
									inventoryItemId: command.inventoryItemId,
									quantity: toNumeric(0),
									acquiredOn: toDateString(new Date()),
								})
								.returning();

							if (!createdLot) {
								throw new Error("ロットを作成できませんでした");
							}

							await setLotQuantity(toInventoryLot(createdLot), quantity);
						}

						for (const lot of others) {
							await setLotQuantity(lot, 0);
						}
					}

					await transaction
						.update(inventoryItem)
						.set({ trackingMode: command.trackingMode })
						.where(
							and(
								eq(inventoryItem.id, command.inventoryItemId),
								eq(inventoryItem.userId, userId),
							),
						);
				}

				await raiseCapacity(transaction, userId, command.inventoryItemId);

				const lots = toStockedLots(
					await loadLots(transaction, userId, command.inventoryItemId),
				);

				return {
					inventoryItemId: command.inventoryItemId,
					trackingMode: command.trackingMode,
					quantity: sumLotQuantities(lots),
					lots,
				};
			});
		},

		async setLotQuantity(command: SetLotQuantityCommand) {
			return db.transaction(async (transaction) => {
				const [storedLot] = await transaction
					.select({
						id: inventoryLot.id,
						quantity: inventoryLot.quantity,
						inventoryItemId: inventoryLot.inventoryItemId,
						trackingMode: inventoryItem.trackingMode,
						stockUnitCode: ingredient.stockUnitCode,
					})
					.from(inventoryLot)
					.innerJoin(
						inventoryItem,
						and(
							eq(inventoryItem.id, inventoryLot.inventoryItemId),
							eq(inventoryItem.userId, inventoryLot.userId),
						),
					)
					.innerJoin(
						ingredient,
						and(
							eq(ingredient.id, inventoryItem.ingredientId),
							eq(ingredient.userId, inventoryItem.userId),
						),
					)
					.where(
						and(
							eq(inventoryLot.id, command.lotId),
							eq(inventoryLot.userId, userId),
						),
					)
					.for("update", { of: inventoryItem })
					.limit(1);

				if (!storedLot) {
					throw new Error("ロットが見つかりません");
				}

				if (parseTrackingMode(storedLot.trackingMode) === "presence") {
					throw new Error("有無だけで管理している食材は、数量を直せません");
				}

				const delta = Number(
					(command.quantity - Number(storedLot.quantity)).toFixed(6),
				);

				if (delta !== 0) {
					await transaction
						.update(inventoryLot)
						.set({ quantity: toNumeric(command.quantity) })
						.where(
							and(
								eq(inventoryLot.id, command.lotId),
								eq(inventoryLot.userId, userId),
							),
						);

					await transaction.insert(inventoryTransaction).values({
						userId,
						inventoryItemId: storedLot.inventoryItemId,
						inventoryLotId: command.lotId,
						inputQuantity: toNumeric(Math.abs(delta)),
						inputUnitCode: storedLot.stockUnitCode,
						requestedQuantityDelta: toNumeric(delta),
						quantityDelta: toNumeric(delta),
						resultingQuantity: toNumeric(command.quantity),
						stockUnitCode: storedLot.stockUnitCode,
						reason: "manual-adjustment",
						occurredAt: new Date(),
					});
				}

				await raiseCapacity(transaction, userId, storedLot.inventoryItemId);

				const lots = toStockedLots(
					await loadLots(transaction, userId, storedLot.inventoryItemId),
				);

				return {
					inventoryItemId: storedLot.inventoryItemId,
					quantity: sumLotQuantities(lots),
					lots,
				};
			});
		},

		async updateLot(command: UpdateInventoryLotCommand) {
			return db.transaction(async (transaction) => {
				const [storedLot] = await transaction
					.select({
						id: inventoryLot.id,
						inventoryItemId: inventoryLot.inventoryItemId,
						ingredientId: inventoryItem.ingredientId,
					})
					.from(inventoryLot)
					.innerJoin(
						inventoryItem,
						and(
							eq(inventoryItem.id, inventoryLot.inventoryItemId),
							eq(inventoryItem.userId, inventoryLot.userId),
						),
					)
					.where(
						and(
							eq(inventoryLot.id, command.lotId),
							eq(inventoryLot.userId, userId),
						),
					)
					.limit(1);

				if (!storedLot) {
					throw new Error("ロットが見つかりません");
				}

				// 食材の行をロックして、加減算と直列にする。
				await transaction
					.select({ id: inventoryItem.id })
					.from(inventoryItem)
					.where(
						and(
							eq(inventoryItem.id, storedLot.inventoryItemId),
							eq(inventoryItem.userId, userId),
						),
					)
					.for("update")
					.limit(1);

				// 期限の日付がなければ、出所もなし。種類は、「なし」の指定だけを残す（resolveLotConditions と同じ規則）。
				const conditions = resolveLotConditions(
					{
						expiresOn: command.expiresOn,
						expiryKind: command.expiryKind,
						expirySource: command.expirySource,
						storage: command.storage,
					},
					toDateString(new Date()),
				);

				await transaction
					.update(inventoryLot)
					.set({
						storage: conditions.storage,
						expiresOn: conditions.expiresOn,
						expiryKind: conditions.expiryKind,
						expirySource: conditions.expirySource,
					})
					.where(
						and(
							eq(inventoryLot.id, command.lotId),
							eq(inventoryLot.userId, userId),
						),
					);

				if (command.saveAsIngredientDefault) {
					await transaction
						.update(ingredient)
						.set({
							defaultExpiryKind: command.expiryKind,
							defaultStorage: command.storage,
						})
						.where(
							and(
								eq(ingredient.id, storedLot.ingredientId),
								eq(ingredient.userId, userId),
							),
						);
				}

				const [storedIngredient] = await transaction
					.select({
						defaultExpiryKind: ingredient.defaultExpiryKind,
						defaultStorage: ingredient.defaultStorage,
					})
					.from(ingredient)
					.where(
						and(
							eq(ingredient.id, storedLot.ingredientId),
							eq(ingredient.userId, userId),
						),
					)
					.limit(1);

				const lots = toStockedLots(
					await loadLots(transaction, userId, storedLot.inventoryItemId),
				);

				return {
					inventoryItemId: storedLot.inventoryItemId,
					quantity: sumLotQuantities(lots),
					lots,
					defaultExpiryKind: parseOptionalValue<InventoryExpiryKind>(
						storedIngredient?.defaultExpiryKind ?? null,
						["use-by", "best-before", "none"],
						"期限の種類",
					),
					defaultStorage: parseOptionalValue<InventoryStorage>(
						storedIngredient?.defaultStorage ?? null,
						["room", "fridge", "freezer"],
						"保存方法",
					),
				};
			});
		},
	};
}
