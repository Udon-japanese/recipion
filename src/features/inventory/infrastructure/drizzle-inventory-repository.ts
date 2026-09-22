import { and, eq } from "drizzle-orm";

import type { DB } from "#/db/client";
import { ingredient } from "#/features/ingredients/infrastructure/ingredient.sql";

import type {
	InventoryAdjustmentCommand,
	InventoryRepository,
} from "../application/inventory-repository";
import {
	applyInventoryAdjustment,
	type InventoryTrackingMode,
} from "../domain/apply-inventory-adjustment";
import { inventoryItem, inventoryTransaction } from "./inventory.sql";

function parseTrackingMode(value: string): InventoryTrackingMode {
	if (value === "exact" || value === "estimated") {
		return value;
	}

	throw new Error(`未対応の在庫管理方式です: ${value}`);
}

function toNumeric(value: number): string {
	return value.toFixed(6);
}

export function createDrizzleInventoryRepository(
	db: DB,
	userId: string,
): InventoryRepository {
	if (userId.trim().length === 0) {
		throw new Error("ユーザーIDを指定してください");
	}

	return {
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
