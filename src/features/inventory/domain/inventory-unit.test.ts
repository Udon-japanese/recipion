import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { inventoryUnitCodeSchema, inventoryUnitCodes } from "./inventory-unit";

describe("inventoryUnitCodeSchema", () => {
	it.each(inventoryUnitCodes)("%sを在庫単位として受け入れる", (unitCode) => {
		expect(v.parse(inventoryUnitCodeSchema, unitCode)).toBe(unitCode);
	});

	it("包装単位は在庫単位として受け入れない", () => {
		expect(() => v.parse(inventoryUnitCodeSchema, "pack")).toThrow(
			"対応していない在庫単位です",
		);
	});
});
