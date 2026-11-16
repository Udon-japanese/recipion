import * as v from "valibot";

export const inventoryUnitCodes = ["count", "g", "ml"] as const;

export const inventoryUnitCodeSchema = v.picklist(
	inventoryUnitCodes,
	"対応していない在庫単位です",
);

export type InventoryUnitCode = v.InferOutput<typeof inventoryUnitCodeSchema>;

type StockUnit = { stockUnitCode: InventoryUnitCode; stockUnitLabel: string };

// 同じ在庫の単位か。g・ml は種類だけ、個数は呼び名まで比べる（個と袋は別の単位）。
export function isSameStockUnit(a: StockUnit, b: StockUnit): boolean {
	return (
		a.stockUnitCode === b.stockUnitCode &&
		(a.stockUnitCode !== "count" || a.stockUnitLabel === b.stockUnitLabel)
	);
}
