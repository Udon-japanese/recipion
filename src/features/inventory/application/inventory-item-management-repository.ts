export type RenameInventoryItemCommand = {
	inventoryItemId: string;
	// 在庫の一覧に出す呼び名。null か空は、食材の名前に戻す。
	displayName: string | null;
};

export type RenameInventoryItemResult = {
	inventoryItemId: string;
	displayName: string | null;
};

export interface InventoryItemManagementRepository {
	// 在庫の食材を削除する（ロットと履歴も消える。食材の名前・別名は残る）。見つからなければ false。
	deleteItem(inventoryItemId: string): Promise<boolean>;

	// 在庫の一覧に出す呼び名を変える。食材そのものは変わらない（レシピとの突き合わせは、食材の名前のまま）。
	renameItem(
		command: RenameInventoryItemCommand,
	): Promise<RenameInventoryItemResult>;
}

export const maxInventoryDisplayNameLength = 50;
