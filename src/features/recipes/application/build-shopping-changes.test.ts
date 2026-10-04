import { describe, expect, it } from "vitest";
import {
	createShoppingItem,
	type ShoppingItem,
} from "#/features/shopping/domain/shopping-item";
import {
	planShoppingFromRecipe,
	type RecipeShoppingNeed,
} from "../domain/plan-shopping-from-recipe";
import { buildShoppingChanges } from "./build-shopping-changes";

const now = new Date("2026-10-05T00:00:00.000Z");

function need(
	name: string,
	quantity: number | null,
	unitLabel: string | null,
): RecipeShoppingNeed {
	return { id: name, name, quantity, unitLabel, amountText: null };
}

describe("buildShoppingChanges", () => {
	const existing: ShoppingItem = createShoppingItem(
		{ name: "玉ねぎ", quantity: 1, unitLabel: "個" },
		now,
		4,
	);

	const rows = planShoppingFromRecipe({
		needs: [
			need("卵", 6, "個"),
			need("玉ねぎ", 3, "個"),
			need("塩", null, null),
		],
		stockItems: [],
		memoItems: [
			{ id: existing.id, name: "玉ねぎ", quantity: 1, unitLabel: "個" },
		],
		duplicateMode: "max",
	});

	it("選んだ行だけを、新しい項目（並び順の最後、売り場つき）と、数量の更新にする", () => {
		const changes = buildShoppingChanges(
			rows,
			new Set(["卵", "玉ねぎ"]),
			[existing],
			now,
		);

		expect(changes.created).toHaveLength(1);
		expect(changes.created[0]).toMatchObject({
			name: "卵",
			quantity: 6,
			unitLabel: "個",
			status: "pending",
			sortOrder: 5,
			categoryId: "eggs",
			categoryAssignment: "automatic",
		});
		expect(changes.updated).toEqual([
			{ ...existing, quantity: 3, updatedAt: now.toISOString() },
		]);
	});

	it("選んでいない行は、何もしない", () => {
		expect(buildShoppingChanges(rows, new Set(), [existing], now)).toEqual({
			created: [],
			updated: [],
		});
	});

	it("メモのまま（keep）の行は、選ばれていても、何もしない", () => {
		const keepRows = planShoppingFromRecipe({
			needs: [need("玉ねぎ", 1, "個")],
			stockItems: [],
			memoItems: [
				{ id: existing.id, name: "玉ねぎ", quantity: 1, unitLabel: "個" },
			],
			duplicateMode: "max",
		});

		expect(
			buildShoppingChanges(keepRows, new Set(["玉ねぎ"]), [existing], now),
		).toEqual({ created: [], updated: [] });
	});

	it("新しい項目が複数あるとき、並び順が重ならない", () => {
		const changes = buildShoppingChanges(
			rows,
			new Set(["卵", "塩"]),
			[existing],
			now,
		);

		expect(changes.created.map((item) => item.sortOrder)).toEqual([5, 6]);
	});
});
