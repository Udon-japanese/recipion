import type {
	InventoryExpiryKind,
	InventoryLot,
	InventoryStorage,
} from "../domain/inventory-lot";

export type UpdateInventoryLotCommand = {
	lotId: string;
	// 期限の日付（YYYY-MM-DD）。null は、期限を消す。出所は、日付があれば「入力」になる。
	expiresOn: string | null;
	expiryKind: InventoryExpiryKind | null;
	storage: InventoryStorage | null;
	// true のとき、この期限の種類と保存方法を、食材の初期値にも保存する。
	saveAsIngredientDefault: boolean;
};

export type UpdateInventoryLotResult = {
	inventoryItemId: string;
	// 食材の数量（ロットの合計）と、操作後の、在庫のあるロット。
	quantity: number;
	lots: InventoryLot[];
	defaultExpiryKind: InventoryExpiryKind | null;
	defaultStorage: InventoryStorage | null;
};

export interface InventoryLotRepository {
	updateLot(
		command: UpdateInventoryLotCommand,
	): Promise<UpdateInventoryLotResult>;
}
