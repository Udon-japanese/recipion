import { describe, expect, it } from "vitest";
import { dishParts, findDishPart } from "./dish-part";

describe("dishParts", () => {
	it("id は重ならず、id から部品を引ける", () => {
		const ids = dishParts.map((part) => part.id);

		expect(new Set(ids).size).toBe(ids.length);
		for (const part of dishParts) {
			expect(findDishPart(part.id)).toBe(part);
		}
		expect(findDishPart("unknown")).toBeUndefined();
	});

	it("色を選ぶ図形（tint）を持つ部品は、色の候補を持つ", () => {
		for (const part of dishParts) {
			const usesTint = part.shapes.some((shape) => shape.fill === "tint");

			expect(usesTint ? part.tints.length > 0 : true).toBe(true);
		}
	});
});
