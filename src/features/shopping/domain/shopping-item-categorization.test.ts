import { describe, expect, it } from "vitest";
import { createShoppingItem } from "./shopping-item";
import { categorizeUnassignedShoppingItems } from "./shopping-item-categorization";

describe("categorizeUnassignedShoppingItems", () => {
	it("未判定の商品を名前から自動分類する", () => {
		const item = createShoppingItem(
			{ name: "卵" },
			new Date("2026-09-22T10:00:00.000Z"),
		);

		const [categorizedItem] = categorizeUnassignedShoppingItems(
			[item],
			new Date("2026-09-22T11:00:00.000Z"),
		);

		expect(categorizedItem).toMatchObject({
			id: item.id,
			categoryId: "eggs",
			categoryAssignment: "automatic",
			updatedAt: "2026-09-22T11:00:00.000Z",
		});
	});

	it("手動設定されたカテゴリを変更しない", () => {
		const item = createShoppingItem({
			name: "卵",
			categoryId: "pantry",
			categoryAssignment: "manual",
		});

		const [categorizedItem] = categorizeUnassignedShoppingItems([item]);

		expect(categorizedItem).toBe(item);
		expect(categorizedItem?.categoryId).toBe("pantry");
	});

	it("意図的な未設定を変更しない", () => {
		const item = {
			...createShoppingItem({ name: "卵" }),
			categoryId: null,
			categoryAssignment: "manual" as const,
		};

		const [categorizedItem] = categorizeUnassignedShoppingItems([item]);

		expect(categorizedItem).toBe(item);
		expect(categorizedItem?.categoryId).toBeNull();
	});

	it("推測できない商品は未判定のままにする", () => {
		const item = createShoppingItem({
			name: "謎の商品",
		});

		const [categorizedItem] = categorizeUnassignedShoppingItems([item]);

		expect(categorizedItem).toBe(item);
		expect(categorizedItem?.categoryAssignment).toBeNull();
	});
});
