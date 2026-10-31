import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import type {
	InventoryExpiryKind,
	InventoryLot,
	InventoryStorage,
} from "../domain/inventory-lot";
import type { InventoryUnitCode } from "../domain/inventory-unit";

export type InventoryListItem = {
	inventoryItemId: string;
	ingredientId: string;
	// 食材の名前（レシピとの突き合わせは、これで行う）。
	name: string;
	// ユーザーが付けた呼び名（在庫の一覧に出す。空は、食材の名前のまま）。
	displayName: string | null;
	// ロットの数量の合計。
	quantity: number;
	// 在庫のあるロット（期限の早い順）。
	lots: InventoryLot[];
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	trackingMode: InventoryTrackingMode;
	// ユーザーが決めた、この食材の期限の種類と初期の保存方法（空は、決めていない）。
	defaultExpiryKind: InventoryExpiryKind | null;
	defaultStorage: InventoryStorage | null;
	// 「作った」で入れた、できあがり（作り置き）の元のレシピ。ふつうの食材は、なし。名前での突き合わせの対象にしない。
	sourceRecipePublicId?: string;
	updatedAt: string;
};

export interface InventoryQueryRepository {
	list(): Promise<InventoryListItem[]>;
}
