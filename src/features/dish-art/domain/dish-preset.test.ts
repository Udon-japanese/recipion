import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { dishPlacementsSchema } from "./dish-cover";
import { dishPresets, pickDishPreset } from "./dish-preset";

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

describe("pickDishPreset", () => {
	it.each([
		["カレーうどん", "curry"],
		["鶏の唐揚げ", "karaage"],
		["親子丼", "tamago-don"],
		["豚汁", "nabe"],
		["きょうの一品", "teishoku"],
	])("%s は %s", (name, id) => {
		expect(pickDishPreset(name).id).toBe(id);
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
	])("%s を断る", (_name, placements) => {
		expect(v.safeParse(dishPlacementsSchema, placements).success).toBe(false);
	});
});
