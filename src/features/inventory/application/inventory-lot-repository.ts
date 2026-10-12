import type {
	InventoryExpiryKind,
	InventoryExpirySource,
	InventoryLot,
	InventoryStorage,
} from "../domain/inventory-lot";

export type UpdateInventoryLotCommand = {
	lotId: string;
	// 期限の日付（YYYY-MM-DD）。null は、期限を消す。出所は、日付があれば「入力」になる。
	expiresOn: string | null;
	// 日付の出所。省略は「入力」（日付があるとき）。自動の目安を、そのまま保存するときは、estimated。
	expirySource?: InventoryExpirySource | null;
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

export type SetLotQuantityCommand = {
	lotId: string;
	// ロットの数量（在庫の単位）。0 以上。0 にすると、そのロットは在庫から外れる。
	quantity: number;
};

export type SetLotQuantityResult = {
	inventoryItemId: string;
	// 食材の数量（ロットの合計）と、操作後の、在庫のあるロット。
	quantity: number;
	lots: InventoryLot[];
};

export interface InventoryLotRepository {
	// ロットの数量を、直接直す（その差を、履歴に残す）。有無だけの食材は直せない。
	setLotQuantity(command: SetLotQuantityCommand): Promise<SetLotQuantityResult>;

	updateLot(
		command: UpdateInventoryLotCommand,
	): Promise<UpdateInventoryLotResult>;
}
