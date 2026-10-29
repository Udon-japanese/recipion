import { describe, expect, it } from "vitest";
import { type DishPlacement, dishCoverLimits } from "./dish-cover";
import { dishParts } from "./dish-part";
import { dishPartCategories } from "./dish-part-category";
import {
	addDishPart,
	duplicateDishPart,
	findDishPartAt,
	moveDishPart,
	reorderDishPart,
	rotateDishPart,
	scaleDishPart,
	setDishPartRotate,
	setDishPartScale,
	snapRotation,
	turnDishPart,
} from "./edit-dish-cover";

const rice: DishPlacement = { partId: "rice", x: 20, y: 20, scale: 0.5 };
const tofu: DishPlacement = { partId: "tofu", x: 25, y: 22, scale: 0.5 };

describe("dishPartCategories", () => {
	it("すべての部品が、ちょうど1つの棚に入る", () => {
		const shelved = dishPartCategories.flatMap((category) => category.partIds);

		expect([...shelved].sort()).toEqual(
			dishParts.map((part) => part.id).sort(),
		);
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
