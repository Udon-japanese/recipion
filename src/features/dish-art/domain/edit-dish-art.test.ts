import { describe, expect, it } from "vitest";
import { type DishPlacement, dishCoverLimits } from "./dish-cover";
import { dishParts } from "./dish-part";
import { dishPartCategories, inventoryOnlyPartIds } from "./dish-part-category";
import {
	addDishPart,
	cycleDishPartSelection,
	duplicateDishPart,
	findDishPartAt,
	moveDishPart,
	moveDishPartToEdge,
	reorderDishPart,
	rotateDishPart,
	scaleDishPart,
	setDishPartRotate,
	setDishPartScale,
	snapRotation,
	turnDishPart,
} from "./edit-dish-art";

const rice: DishPlacement = { partId: "rice", x: 20, y: 20, scale: 0.5 };
const tofu: DishPlacement = { partId: "tofu", x: 25, y: 22, scale: 0.5 };

describe("dishPartCategories", () => {
	it("在庫専用を除くすべての部品が、ちょうど1つの棚に入る", () => {
		const shelved = dishPartCategories.flatMap((category) => category.partIds);

		expect([...shelved].sort()).toEqual(
			dishParts
				.map((part) => part.id)
				.filter((id) => !inventoryOnlyPartIds.includes(id))
				.sort(),
		);
	});

	it("在庫専用の部品は、実在する", () => {
		const ids = dishParts.map((part) => part.id);

		for (const id of inventoryOnlyPartIds) {
			expect(ids).toContain(id);
		}
	});
});

describe("addDishPart", () => {
	it("中央の手前に足す", () => {
		expect(addDishPart([rice], "tofu")).toEqual([
			rice,
			{ partId: "tofu", x: 50, y: 50, scale: 0.5 },
		]);
	});

	it("知らない部品と、上限を超える追加は、なにもしない", () => {
		expect(addDishPart([rice], "unknown")).toEqual([rice]);

		const full = Array.from({ length: dishCoverLimits.maxParts }, () => rice);

		expect(addDishPart(full, "tofu")).toHaveLength(dishCoverLimits.maxParts);
	});
});

describe("moveDishPart", () => {
	it("枠の外には出さない", () => {
		expect(moveDishPart([rice], 0, 130, -5)[0]).toMatchObject({ x: 100, y: 0 });
	});
});

describe("scaleDishPart / rotateDishPart", () => {
	it("拡大は、上限で止まる", () => {
		let placements: DishPlacement[] = [rice];

		for (let count = 0; count < 40; count += 1) {
			placements = scaleDishPart(placements, 0, 1);
		}

		expect(placements[0]?.scale).toBe(dishCoverLimits.maxScale);
	});

	it("回転は、-180〜180 に収まる", () => {
		const turned = rotateDishPart([{ ...rice, rotate: 180 }], 0, 1);

		expect(turned[0]?.rotate).toBe(-165);
	});
});

describe("reorderDishPart", () => {
	it("重なり順を入れ替え、選択の番号を追う", () => {
		expect(reorderDishPart([rice, tofu], 0, 1)).toEqual({
			placements: [tofu, rice],
			selected: 1,
		});
	});

	it("端では動かない", () => {
		expect(reorderDishPart([rice, tofu], 1, 1).selected).toBe(1);
	});
});

describe("findDishPartAt", () => {
	it("重なっていれば、手前の部品を選ぶ", () => {
		expect(findDishPartAt([rice, tofu], 22, 21)).toBe(1);
	});

	it("何もないところは -1", () => {
		expect(findDishPartAt([rice, tofu], 90, 90)).toBe(-1);
	});
});

describe("setDishPartScale / setDishPartRotate", () => {
	it("大きさは範囲に収める", () => {
		expect(setDishPartScale([rice], 0, 99)[0]?.scale).toBe(
			dishCoverLimits.maxScale,
		);
		expect(setDishPartScale([rice], 0, 0)[0]?.scale).toBe(
			dishCoverLimits.minScale,
		);
	});

	it("向きは -180〜180 に巻き戻す", () => {
		expect(setDishPartRotate([rice], 0, 190)[0]?.rotate).toBe(-170);
		expect(setDishPartRotate([rice], 0, -190)[0]?.rotate).toBe(170);
		expect(setDishPartRotate([rice], 0, 45)[0]?.rotate).toBe(45);
	});
});

describe("duplicateDishPart", () => {
	it("同じ設定の部品を、少しずらして手前に足す", () => {
		expect(duplicateDishPart([rice], 0)).toEqual([
			rice,
			{ ...rice, x: 26, y: 26 },
		]);
	});

	it("上限では足さない", () => {
		const full = Array.from({ length: dishCoverLimits.maxParts }, () => rice);

		expect(duplicateDishPart(full, 0)).toHaveLength(dishCoverLimits.maxParts);
	});
});

describe("turnDishPart / snapRotation", () => {
	it("90度ずつ回し、-180〜180 に収める", () => {
		expect(turnDishPart([rice], 0, 90)[0]?.rotate).toBe(90);
		expect(turnDishPart([{ ...rice, rotate: 90 }], 0, 90)[0]?.rotate).toBe(
			-180,
		);
		expect(turnDishPart([{ ...rice, rotate: -90 }], 0, -90)[0]?.rotate).toBe(
			-180,
		);
	});

	it("90度の倍数に近いときだけ、合わせる", () => {
		expect(snapRotation(87)).toBe(90);
		expect(snapRotation(-93)).toBe(-90);
		expect(snapRotation(40)).toBe(40);
	});
});

describe("moveDishPartToEdge", () => {
	const natto: DishPlacement = { partId: "natto", x: 30, y: 30, scale: 0.5 };

	it.each([
		{
			title: "間 → 手前",
			index: 1,
			edge: "front" as const,
			order: [rice, natto, tofu],
			selected: 2,
		},
		{
			title: "間 → 奥",
			index: 1,
			edge: "back" as const,
			order: [tofu, rice, natto],
			selected: 0,
		},
		{
			title: "奥 → 手前",
			index: 0,
			edge: "front" as const,
			order: [tofu, natto, rice],
			selected: 2,
		},
		{
			title: "すでに手前",
			index: 2,
			edge: "front" as const,
			order: [rice, tofu, natto],
			selected: 2,
		},
	])("$title", ({ index, edge, order, selected }) => {
		expect(moveDishPartToEdge([rice, tofu, natto], index, edge)).toEqual({
			placements: order,
			selected,
		});
	});

	it("1つだけ・番号が範囲の外なら、並びは変えない", () => {
		expect(moveDishPartToEdge([rice], 0, "back")).toEqual({
			placements: [rice],
			selected: 0,
		});
		expect(moveDishPartToEdge([rice], 3, "front")).toEqual({
			placements: [rice],
			selected: 3,
		});
	});
});

describe("cycleDishPartSelection", () => {
	it.each([
		{
			title: "未選択で次 → いちばん奥",
			count: 3,
			selected: -1,
			direction: 1 as const,
			expected: 0,
		},
		{
			title: "未選択で前 → いちばん手前",
			count: 3,
			selected: -1,
			direction: -1 as const,
			expected: 2,
		},
		{
			title: "次へ",
			count: 3,
			selected: 0,
			direction: 1 as const,
			expected: 1,
		},
		{
			title: "手前の端の次 → 奥へ戻る",
			count: 3,
			selected: 2,
			direction: 1 as const,
			expected: 0,
		},
		{
			title: "奥の端の前 → 手前へ戻る",
			count: 3,
			selected: 0,
			direction: -1 as const,
			expected: 2,
		},
		{
			title: "部品がない",
			count: 0,
			selected: -1,
			direction: 1 as const,
			expected: -1,
		},
	])("$title", ({ count, selected, direction, expected }) => {
		expect(cycleDishPartSelection(count, selected, direction)).toBe(expected);
	});
});
