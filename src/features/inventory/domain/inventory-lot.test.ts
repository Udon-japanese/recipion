import { describe, expect, it } from "vitest";
import {
	addDays,
	allocateDecrease,
	findMergeableLot,
	type InventoryLot,
	isValidDateString,
	resolveLotConditions,
	sortLotsForConsumption,
	sumLotQuantities,
	toDateString,
	validateManualAllocations,
} from "./inventory-lot";

function lot(overrides: Partial<InventoryLot> & { id: string }): InventoryLot {
	return {
		quantity: 1,
		acquiredOn: "2026-10-01",
		storage: null,
		expiresOn: null,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-10-01T00:00:00.000Z",
		...overrides,
	};
}

describe("sortLotsForConsumption（減らす順）", () => {
	it("期限の早い順。期限なしは、期限があるものの後で、買った日の古い順", () => {
		const sorted = sortLotsForConsumption([
			lot({ id: "no-expiry-new", acquiredOn: "2026-10-03" }),
			lot({ id: "late", expiresOn: "2026-10-20" }),
			lot({ id: "no-expiry-old", acquiredOn: "2026-10-01" }),
			lot({ id: "early", expiresOn: "2026-10-10" }),
		]);

		expect(sorted.map((item) => item.id)).toEqual([
			"early",
			"late",
			"no-expiry-old",
			"no-expiry-new",
		]);
	});
});

describe("findMergeableLot（合体の条件）", () => {
	const base = lot({
		id: "a",
		storage: "fridge",
		expiresOn: "2026-10-10",
		expiryKind: "use-by",
		expirySource: "entered",
	});

	it("保存方法・期限・種類・出所が同じなら、買った日が違っても合体する", () => {
		expect(
			findMergeableLot([base], {
				acquiredOn: "2026-10-05",
				storage: "fridge",
				expiresOn: "2026-10-10",
				expiryKind: "use-by",
				expirySource: "entered",
			})?.id,
		).toBe("a");
	});

	it("どれか1つでも違えば、合体しない", () => {
		const same = {
			acquiredOn: "2026-10-01",
			storage: "fridge",
			expiresOn: "2026-10-10",
			expiryKind: "use-by",
			expirySource: "entered",
		} as const;

		for (const changed of [
			{ storage: "freezer" },
			{ expiresOn: "2026-10-11" },
			{ expiryKind: "best-before" },
			{ expirySource: "estimated" },
		] as const) {
			expect(findMergeableLot([base], { ...same, ...changed })).toBeUndefined();
		}
	});

	it("期限がないロットは、同じ日に買ったものだけ合体する", () => {
		const noExpiry = lot({ id: "n", acquiredOn: "2026-10-01" });
		const conditions = {
			storage: null,
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
		} as const;

		expect(
			findMergeableLot([noExpiry], { ...conditions, acquiredOn: "2026-10-01" })
				?.id,
		).toBe("n");
		expect(
			findMergeableLot([noExpiry], { ...conditions, acquiredOn: "2026-10-02" }),
		).toBeUndefined();
	});
});

describe("allocateDecrease（自動の割り振り）", () => {
	const lots = [
		lot({ id: "late", quantity: 3, expiresOn: "2026-10-20" }),
		lot({ id: "early", quantity: 2, expiresOn: "2026-10-10" }),
		lot({ id: "empty", quantity: 0, expiresOn: "2026-10-05" }),
	];

	it("期限の早いロットから引き、足りなければ次のロットへ進む", () => {
		expect(allocateDecrease(lots, 3, "exact")).toEqual([
			{ lotId: "early", quantity: 2 },
			{ lotId: "late", quantity: 1 },
		]);
		expect(allocateDecrease(lots, 1, "exact")).toEqual([
			{ lotId: "early", quantity: 1 },
		]);
	});

	it("足りないとき、「正確」はエラー、「だいたい」は最後のロットに上乗せして0にする", () => {
		expect(() => allocateDecrease(lots, 6, "exact")).toThrow(
			"在庫数量が不足しています",
		);
		expect(allocateDecrease(lots, 6, "estimated")).toEqual([
			{ lotId: "early", quantity: 2 },
			{ lotId: "late", quantity: 4 },
		]);
	});

	it("在庫のロットがなければ、「だいたい」は何も割り振らない", () => {
		expect(allocateDecrease([], 1, "estimated")).toEqual([]);
		expect(() => allocateDecrease([], 1, "exact")).toThrow();
	});
});

describe("validateManualAllocations（ロット指定）", () => {
	const lots = [lot({ id: "a", quantity: 3 }), lot({ id: "b", quantity: 2 })];

	it("ロットごとの数量を、そのまま受け付ける", () => {
		expect(
			validateManualAllocations(
				lots,
				[
					{ lotId: "a", quantity: 1 },
					{ lotId: "b", quantity: 1 },
				],
				"exact",
			),
		).toEqual([
			{ lotId: "a", quantity: 1 },
			{ lotId: "b", quantity: 1 },
		]);
	});

	it("不正な指定を拒否する", () => {
		expect(() =>
			validateManualAllocations(lots, [{ lotId: "x", quantity: 1 }], "exact"),
		).toThrow("ロットが見つかりません");
		expect(() =>
			validateManualAllocations(
				lots,
				[
					{ lotId: "a", quantity: 1 },
					{ lotId: "a", quantity: 1 },
				],
				"exact",
			),
		).toThrow("重複");
		expect(() =>
			validateManualAllocations(lots, [{ lotId: "a", quantity: 0 }], "exact"),
		).toThrow("0より大きく");
		expect(() =>
			validateManualAllocations(lots, [{ lotId: "b", quantity: 3 }], "exact"),
		).toThrow("不足");
	});

	it("「だいたい」は、ロットの数量を超えても受け付ける（0に丸める）", () => {
		expect(
			validateManualAllocations(
				lots,
				[{ lotId: "b", quantity: 3 }],
				"estimated",
			),
		).toEqual([{ lotId: "b", quantity: 3 }]);
	});
});

describe("sumLotQuantities", () => {
	it("小数の誤差を丸めて合計する", () => {
		expect(sumLotQuantities([{ quantity: 0.1 }, { quantity: 0.2 }])).toBe(0.3);
	});
});

describe("toDateString", () => {
	it("日本時間の日付にする（UTC の夜は、日本では翌日）", () => {
		expect(toDateString(new Date("2026-09-30T20:00:00.000Z"))).toBe(
			"2026-10-01",
		);
		expect(toDateString(new Date("2026-10-01T10:00:00.000Z"))).toBe(
			"2026-10-01",
		);
	});
});

describe("日付の計算", () => {
	it("存在する日付だけを有効とする", () => {
		expect(isValidDateString("2026-10-05")).toBe(true);
		expect(isValidDateString("2026-02-30")).toBe(false);
		expect(isValidDateString("2026-1-5")).toBe(false);
		expect(isValidDateString("")).toBe(false);
	});

	it("日数を足す（月・年をまたぐ）", () => {
		expect(addDays("2026-10-05", 3)).toBe("2026-10-08");
		expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
		expect(addDays("2026-12-30", 7)).toBe("2027-01-06");
	});
});

describe("resolveLotConditions", () => {
	const today = "2026-10-05";

	it("何も指定しなければ、今日に買った、期限なしのロットにする", () => {
		expect(resolveLotConditions(undefined, today)).toEqual({
			acquiredOn: today,
			storage: null,
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
		});
	});

	it("期限の日付があれば、出所は「入力」を既定にし、指定した種類・保存方法を残す", () => {
		expect(
			resolveLotConditions(
				{ expiresOn: "2026-10-10", expiryKind: "use-by", storage: "fridge" },
				today,
			),
		).toEqual({
			acquiredOn: today,
			storage: "fridge",
			expiresOn: "2026-10-10",
			expiryKind: "use-by",
			expirySource: "entered",
		});
	});

	it("日付がないとき、種類は「なし」だけを残し、出所は付けない", () => {
		expect(
			resolveLotConditions(
				{ expiryKind: "use-by", expirySource: "estimated" },
				today,
			),
		).toMatchObject({ expiryKind: null, expirySource: null });
		expect(resolveLotConditions({ expiryKind: "none" }, today)).toMatchObject({
			expiryKind: "none",
			expirySource: null,
		});
	});
});
