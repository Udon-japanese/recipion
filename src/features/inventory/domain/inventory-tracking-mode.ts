import * as v from "valibot";

/**
 * 在庫の管理方法。
 * - exact: 正確に管理（数量が足りないと、減らせない）。
 * - estimated: だいたいで管理（足りなければ 0 までに丸める）。
 * - presence: 有無だけ（ある／ない。数量は、ユーザーに見せず、設定もさせない）。
 *   内部では、ロットの数量を 0 か 1 に固定する（ロットのテーブルを使い回して、期限を持たせるため）。
 *   「ある」ならロットの数量が 1、「ない」なら 0。判定は、在庫があるかだけで、「作った」でも減らさない。
 */
export const inventoryTrackingModes = [
	"exact",
	"estimated",
	"presence",
] as const;

export type InventoryTrackingMode = (typeof inventoryTrackingModes)[number];

export const inventoryTrackingModeSchema = v.picklist(inventoryTrackingModes);

// 数量を追う管理方法（有無だけ以外）。
export type QuantityTrackingMode = Exclude<InventoryTrackingMode, "presence">;

export const presenceLotQuantity = 1;
