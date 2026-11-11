import { describe, expect, it } from "vitest";
import type { InventoryLot } from "#/features/inventory/domain/inventory-lot";
import { judgeIngredientStock } from "./judge-ingredient-stock";

describe("judgeIngredientStock", () => {
	it("数量を比べられるとき：足りていれば enough、足りなければ不足分を返す", () => {
		const need = { name: "玉ねぎ", quantity: 3, unitLabel: "個" };

		expect(
			judgeIngredientStock(need, { quantity: 3, stockUnitCode: "count" }),
		).toEqual({ status: "enough", basis: "compared" });

		expect(
			judgeIngredientStock(need, { quantity: 1, stockUnitCode: "count" }),
		).toEqual({
			status: "short",
			basis: "compared",
			shortage: 2,
			isRegistered: true,
			hasStock: true,
		});
	});

	it("有無だけで管理している食材は、量にかかわらず、在庫があれば足りている（大さじ2でも）", () => {
		const need = { name: "オリーブオイル", quantity: 2, unitLabel: "大さじ" };

		expect(
			judgeIngredientStock(need, {
				quantity: 1,
				stockUnitCode: "ml",
				isPresenceOnly: true,
			}),
		).toEqual({ status: "enough", basis: "presence" });

		// 「ない」（0）なら、不足。在庫が 0 なので、hasStock は false。
		expect(
			judgeIngredientStock(need, {
				quantity: 0,
				stockUnitCode: "ml",
				isPresenceOnly: true,
			}),
		).toEqual({
			status: "short",
			basis: "presence",
			shortage: null,
			isRegistered: true,
			hasStock: false,
		});
	});

	it("目印の量（1ml）と比べない：数量を追う食材は、足りなければ不足のまま", () => {
		const need = { name: "オリーブオイル", quantity: 2, unitLabel: "大さじ" };

		expect(
			judgeIngredientStock(need, { quantity: 1, stockUnitCode: "ml" }),
		).toMatchObject({ status: "short", basis: "compared", hasStock: true });
	});

	it("カタログで換算して比べる（塩 大さじ1 は 18g）", () => {
		const need = { name: "塩", quantity: 1, unitLabel: "大さじ" };

		expect(
			judgeIngredientStock(need, { quantity: 20, stockUnitCode: "g" }).status,
		).toBe("enough");
		expect(
			judgeIngredientStock(need, { quantity: 10, stockUnitCode: "g" }),
		).toMatchObject({ status: "short", shortage: 8 });
	});

	it("「少々」「適量」は、在庫があれば足りている", () => {
		const need = { name: "塩", quantity: null, unitLabel: null };

		expect(
			judgeIngredientStock(need, { quantity: 1, stockUnitCode: "g" }),
		).toEqual({ status: "enough", basis: "presence" });
	});

	it("在庫が0なら不足（登録はある）、登録がなければ不足（登録なし）", () => {
		const need = { name: "大葉", quantity: null, unitLabel: null };

		expect(
			judgeIngredientStock(need, { quantity: 0, stockUnitCode: "count" }),
		).toEqual({
			status: "short",
			basis: "presence",
			shortage: null,
			isRegistered: true,
			hasStock: false,
		});
		expect(judgeIngredientStock(need, null)).toEqual({
			status: "short",
			basis: "presence",
			shortage: null,
			isRegistered: false,
			hasStock: false,
		});
	});

	it("換算できない単位は、数量を比べず、在庫の有無で判定する", () => {
		// カタログにない食材（「個」と「g」は、換算の手がかりがない）
		const need = { name: "謎の食材", quantity: 300, unitLabel: "g" };

		expect(
			judgeIngredientStock(need, { quantity: 1, stockUnitCode: "count" }),
		).toEqual({ status: "enough", basis: "presence" });
	});
});

describe("judgeIngredientStock（ロットの換算）", () => {
	function udonLot(id: string, quantity: number): InventoryLot {
		return {
			id,
			quantity,
			acquiredOn: "2026-11-01",
			storage: "freezer",
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
			purchaseUnit: { label: "個", quantity: 110, quantityUnitLabel: "g" },
			createdAt: `2026-11-01T00:00:00.000Z-${id}`,
		};
	}

	const need = { name: "冷凍うどん", quantity: 400, unitLabel: "g" };

	it("カタログ（1玉＝200g）では足りる3個でも、1個＝110gなら 330g で足りず、不足を切り上げて1個", () => {
		expect(
			judgeIngredientStock(need, {
				quantity: 3,
				stockUnitCode: "count",
				stockUnitLabel: "個",
				lots: [udonLot("a", 3)],
			}),
		).toEqual({
			status: "short",
			basis: "compared",
			shortage: 1,
			isRegistered: true,
			hasStock: true,
		});
	});

	it("1個＝110gが4個（440g）なら、足りている", () => {
		expect(
			judgeIngredientStock(need, {
				quantity: 4,
				stockUnitCode: "count",
				stockUnitLabel: "個",
				lots: [udonLot("a", 4)],
			}),
		).toEqual({ status: "enough", basis: "compared" });
	});
});
