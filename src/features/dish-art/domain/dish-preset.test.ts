import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { dishPlacementsSchema } from "./dish-cover";
import { dishPlaceholders, pickDishPlaceholder } from "./dish-placeholder";
import { dishPresets } from "./dish-preset";

describe("dishPresets", () => {
	it("すべてのプリセットが、保存の検証を通る", () => {
		for (const preset of dishPresets) {
			expect(v.safeParse(dishPlacementsSchema, preset.placements).success).toBe(
				true,
			);
		}
	});

	it("識別子が重ならない", () => {
		const ids = dishPresets.map((preset) => preset.id);

		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("dishPlaceholders", () => {
	it("すべてのプレースホルダーが、保存の検証を通る", () => {
		for (const placements of dishPlaceholders) {
			expect(v.safeParse(dishPlacementsSchema, placements).success).toBe(true);
		}
	});

	it("同じ種なら、いつも同じ絵になる", () => {
		expect(pickDishPlaceholder("abc123")).toBe(pickDishPlaceholder("abc123"));
	});

	it("種によって、いくつかの絵に分かれる", () => {
		const picked = new Set(
			Array.from({ length: 60 }, (_, index) =>
				dishPlaceholders.indexOf(pickDishPlaceholder(`recipe-${index}`)),
			),
		);

		expect(picked.size).toBeGreaterThan(1);
	});
});

describe("dishPlacementsSchema", () => {
	const valid = { partId: "rice", x: 50, y: 50 };

	it.each([
		["知らない部品", [{ ...valid, partId: "unknown" }]],
		["範囲外の座標", [{ ...valid, x: 101 }]],
		["範囲外の拡大", [{ ...valid, scale: 10 }]],
		["色の形式", [{ ...valid, tint: "red" }]],
		["部品の数", Array.from({ length: 31 }, () => valid)],
		["空の絵", []],
	])("%s を断る", (_name, placements) => {
		expect(v.safeParse(dishPlacementsSchema, placements).success).toBe(false);
	});
});
