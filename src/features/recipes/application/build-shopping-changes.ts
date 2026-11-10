import type { ShoppingBranchSide } from "#/features/shopping/domain/shopping-branch";
import { findConversionDefault } from "#/features/shopping/domain/shopping-conversion-default";
import {
	createShoppingItem,
	type ShoppingItem,
} from "#/features/shopping/domain/shopping-item";
import { categorizeUnassignedShoppingItems } from "#/features/shopping/domain/shopping-item-categorization";
import {
	findShoppingItemMemory,
	type ShoppingMemories,
} from "#/features/shopping/domain/shopping-item-memory";
import type { RecipeShoppingRow } from "../domain/plan-shopping-from-recipe";

export type ShoppingChanges = {
	// 新しく作る買い物項目。
	created: ShoppingItem[];
	// 数量を変える、既存の買い物項目。
	updated: ShoppingItem[];
};

// 入れ先。省略は、通常のメモ。条件つきのメモの「そうなら／そうでなければ」の側にも入れられる。
export type ShoppingDestination = {
	branchId: string;
	side: ShoppingBranchSide;
};

export type BuildShoppingChangesOptions = {
	destination?: ShoppingDestination;
	// 新しい項目の並び順の起点。省略は、memoItems の最大値（入れ先が側のときは、全項目の最大値を渡す）。
	highestSortOrder?: number;
	// 覚えた買い方。新しい項目に、いつものカテゴリと、その単位の換算の記憶を付ける。
	memories?: ShoppingMemories;
};

/**
 * 選んだ行から、買い物メモの変更を作る。
 * - 新しい項目は、並び順の最後に作る。カテゴリは、いつもの買い方 → 売り場の自動判定。
 *   換算は、その食材×単位の換算の記憶 → 食材と単位からの推定。
 * - すでにある項目は、数量だけを変える（換算の設定などは、そのまま）。
 * - メモのままの行（keep）は、選ばれていても、何もしない。
 * - 入れ先が条件つきのメモの側なら、新しい項目は、その側の項目になる。
 */
export function buildShoppingChanges(
	rows: readonly RecipeShoppingRow[],
	selectedNeedIds: ReadonlySet<string>,
	memoItems: readonly ShoppingItem[],
	now = new Date(),
	options: BuildShoppingChangesOptions = {},
): ShoppingChanges {
	const { destination, memories } = options;
	const highestSortOrder =
		options.highestSortOrder ??
		memoItems.reduce((highest, item) => Math.max(highest, item.sortOrder), -1);
	const memoItemsById = new Map(memoItems.map((item) => [item.id, item]));

	const created: ShoppingItem[] = [];
	const updated: ShoppingItem[] = [];

	for (const row of rows) {
		if (!selectedNeedIds.has(row.need.id)) {
			continue;
		}

		if (row.plan === "add") {
			const memory = memories
				? findShoppingItemMemory(memories.itemMemories, row.need.name)
				: undefined;
			const conversion = memories
				? findConversionDefault(
						memories.conversionDefaults,
						row.need.name,
						row.amount.unitLabel,
					)
				: undefined;

			created.push(
				createShoppingItem(
					{
						name: row.need.name,
						quantity: row.amount.quantity,
						unitLabel: row.amount.unitLabel,
						...(conversion
							? { inventoryConversion: conversion.inventoryConversion }
							: {}),
						...(memory
							? {
									categoryId: memory.categoryId,
									categoryAssignment: memory.categoryAssignment,
								}
							: {}),
						...(destination
							? { branchId: destination.branchId, branchSide: destination.side }
							: {}),
					},
					now,
					highestSortOrder + 1 + created.length,
				),
			);
		} else if (row.plan === "update" && row.existing) {
			const existingItem = memoItemsById.get(row.existing.id);

			if (existingItem) {
				updated.push({
					...existingItem,
					quantity: row.nextQuantity,
					updatedAt: now.toISOString(),
				});
			}
		}
	}

	return {
		created: categorizeUnassignedShoppingItems(created, now),
		updated,
	};
}
