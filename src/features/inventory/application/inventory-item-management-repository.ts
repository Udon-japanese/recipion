import type { InventoryLot } from "../domain/inventory-lot";

export type RenameInventoryItemCommand = {
	inventoryItemId: string;
	// 在庫の一覧に出す呼び名。null か空は、食材の名前に戻す。
	displayName: string | null;
};

export type RenameInventoryItemResult = {
	inventoryItemId: string;
	displayName: string | null;
};

export type ChangeStockUnitCommand = {
	inventoryItemId: string;
	stockUnitCode: "count" | "g" | "ml";
	// 在庫の単位の呼び名（個・本・玉・枚・g・ml）。
	stockUnitLabel: string;
	// ロットごとの数量（新しい単位）。ないロットは、換算した数量になる。
	// 換算できない単位に変えるときは、在庫のある全ロットの数量が必要。
	lotQuantities?: { lotId: string; quantity: number }[];
};

export type ChangeStockUnitResult = {
	inventoryItemId: string;
	stockUnitCode: "count" | "g" | "ml";
	stockUnitLabel: string;
	// 変更後の、食材の数量（ロットの合計）と、在庫のあるロット。
	quantity: number;
	lots: InventoryLot[];
};

export interface InventoryItemManagementRepository {
	// 在庫の単位を変える（食材の単位が変わり、ロットの数量は換算される）。有無だけの食材は変えられない。
	changeStockUnit(
		command: ChangeStockUnitCommand,
	): Promise<ChangeStockUnitResult>;

	// 在庫の食材を削除する（ロットと履歴も消える。食材の名前・別名は残る）。見つからなければ false。
	deleteItem(inventoryItemId: string): Promise<boolean>;

	// 在庫の一覧に出す呼び名を変える。食材そのものは変わらない（レシピとの突き合わせは、食材の名前のまま）。
	renameItem(
		command: RenameInventoryItemCommand,
	): Promise<RenameInventoryItemResult>;
}

export const maxInventoryDisplayNameLength = 50;
