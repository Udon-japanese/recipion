import { describe, expect, it } from "vitest";
import { findDishPart } from "./dish-part";
import { dishPartCategories, partsInCategory } from "./dish-part-category";
import { dishPartReadings } from "./dish-part-readings";

describe("dishPartReadings", () => {
	it("棚に並ぶ部品で、名前に漢字があるものは、すべて読みを持つ（かなで探せる）", () => {
		const missing = dishPartCategories
			.flatMap(partsInCategory)
			.filter((part) => /\p{Script=Han}/u.test(part.label))
			.filter((part) => dishPartReadings[part.id] === undefined)
			.map((part) => `${part.id}（${part.label}）`);

		expect(missing).toEqual([]);
	});

	it("読みの ID は、すべて実在し、読みは、ひらがな（と長音）だけ", () => {
		for (const [id, reading] of Object.entries(dishPartReadings)) {
			expect(findDishPart(id), id).toBeDefined();
			expect(reading, id).toMatch(/^[ぁ-ゖー]+$/u);
		}
	});
});
