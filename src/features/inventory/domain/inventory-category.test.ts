import { describe, expect, it } from "vitest";
import { resolveInventoryItemCategory } from "./inventory-category";

describe("resolveInventoryItemCategory", () => {
	it.each([
		["保存したカテゴリが、名前の推定より優先", "卵", "other", "other"],
		["未設定は、名前から推定する", "卵", null, "eggs"],
		[
			"カテゴリより前の控え（なし）も、名前から推定する",
			"卵",
			undefined,
			"eggs",
		],
		["日用品の名前も推定する", "トイレットペーパー", null, "household"],
		["推定できない名前は、未設定のまま", "謎の食材", null, null],
	] as const)("%s", (_, name, categoryId, expected) => {
		expect(resolveInventoryItemCategory({ name, categoryId })).toBe(expected);
	});
});
