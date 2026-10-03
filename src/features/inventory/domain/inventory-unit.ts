import * as v from "valibot";

export const inventoryUnitCodes = ["count", "g", "ml"] as const;

export const inventoryUnitCodeSchema = v.picklist(
	inventoryUnitCodes,
	"対応していない在庫単位です",
);

export type InventoryUnitCode = v.InferOutput<typeof inventoryUnitCodeSchema>;
