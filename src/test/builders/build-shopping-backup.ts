import { createShoppingBranch } from "#/features/shopping/domain/shopping-branch";
import { createShoppingItem } from "#/features/shopping/domain/shopping-item";
import { createShoppingStore } from "#/features/shopping/domain/shopping-store";

const now = new Date("2026-11-01T03:00:00.000Z");

// 書き出し・読み込みのテスト用の、買い物メモのひとそろい（店・条件つきメモ・それを指す項目・購入済みの項目）。
export function buildShoppingData() {
	const store = {
		...createShoppingStore("駅前のスーパー", 0, now),
		id: "store-1",
	};
	const branch = createShoppingBranch(
		{ condition: "売っていたら", thenLabel: "ハンバーグ" },
		0,
		now,
		"branch-1",
	);
	const egg = {
		...createShoppingItem({ name: "卵", storeId: store.id }, now, 0),
		id: "item-egg",
	};
	const mince = {
		...createShoppingItem(
			{ name: "合い挽き肉", branchId: branch.id, branchSide: "condition" },
			now,
			1,
		),
		id: "item-mince",
	};
	const milk = {
		...createShoppingItem({ name: "牛乳" }, now, 2),
		id: "item-milk",
		status: "purchased" as const,
	};

	return {
		items: [egg, mince, milk],
		stores: [store],
		branches: [branch],
		storeDefaults: [{ nameKey: "卵", storeId: store.id }],
		conversionMemories: [
			{
				key: "卵|パック",
				nameKey: "卵",
				unitLabel: "パック",
				inventoryConversion: {
					inputUnitCode: "パック",
					stockUnitCode: "count" as const,
					stockUnitLabel: "個",
					stockQuantityPerInputUnit: 10,
					trackingMode: "exact" as const,
				},
				usedAt: now.getTime(),
			},
		],
		itemMemories: [
			{
				nameKey: "卵",
				quantity: 2,
				unitLabel: "パック",
				categoryId: "eggs" as const,
				categoryAssignment: "manual" as const,
				usedAt: now.getTime(),
			},
		],
	};
}
