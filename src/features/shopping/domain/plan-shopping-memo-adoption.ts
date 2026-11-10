import type {
	ShoppingConversionMemoryRecord,
	ShoppingStoreDefault,
} from "#/local-db/database";
import type { ShoppingBranch } from "./shopping-branch";
import type { ShoppingItem } from "./shopping-item";
import type { ShoppingItemMemory } from "./shopping-item-memory";
import type { ShoppingStore } from "./shopping-store";

export type ShoppingMemoData = {
	items: ShoppingItem[];
	stores: ShoppingStore[];
	branches: ShoppingBranch[];
	storeDefaults: ShoppingStoreDefault[];
	conversionMemories: ShoppingConversionMemoryRecord[];
	itemMemories: ShoppingItemMemory[];
};

// アカウントに足す行（ゲストの行は、すべて消す）。
export type ShoppingMemoAdoption = ShoppingMemoData & {
	// 同じ名前の店があったので、1つにまとめた数。
	mergedStoreCount: number;
};

function nextSortOrder(rows: readonly { sortOrder: number }[]): number {
	return rows.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);
}

function storeNameKey(name: string): string {
	return name.trim().normalize("NFKC");
}

// ログインする前（ゲスト）の買い物メモを、アカウントのメモに移すときの、足す行。
// - 店：同じ名前の店がアカウントにあれば、そちらにまとめる（項目・いつも買う店の店も付け替える）。なければ、後ろに足す。
// - 項目・条件つきのメモ：アカウントのメモの後ろに、ゲストの並びのまま足す。
// - いつも買う店・換算の記憶・いつもの買い方：同じ食材（×単位）がアカウントにあれば、アカウントの方を残す。
export function planShoppingMemoAdoption(
	guest: ShoppingMemoData,
	account: ShoppingMemoData,
): ShoppingMemoAdoption {
	const accountStoreIdByName = new Map(
		account.stores.map((store) => [storeNameKey(store.name), store.id]),
	);
	const storeIdMap = new Map<string, string>();
	const stores: ShoppingStore[] = [];
	let storeSortOrder = nextSortOrder(account.stores);

	for (const store of guest.stores) {
		const sameNameId = accountStoreIdByName.get(storeNameKey(store.name));

		if (sameNameId !== undefined) {
			storeIdMap.set(store.id, sameNameId);
			continue;
		}

		stores.push({ ...store, sortOrder: storeSortOrder });
		storeSortOrder += 1;
	}

	const remapStoreId = (storeId: string | null) =>
		storeId === null ? null : (storeIdMap.get(storeId) ?? storeId);
	const itemSortStart = nextSortOrder(account.items);
	const branchSortStart = nextSortOrder(account.branches);
	const accountDefaultKeys = new Set(
		account.storeDefaults.map((entry) => entry.nameKey),
	);
	const accountMemoryKeys = new Set(
		account.conversionMemories.map((memory) => memory.key),
	);
	const accountItemMemoryKeys = new Set(
		account.itemMemories.map((memory) => memory.nameKey),
	);

	return {
		items: [...guest.items]
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((item, index) => ({
				...item,
				storeId: remapStoreId(item.storeId),
				sortOrder: itemSortStart + index,
			})),
		stores,
		branches: [...guest.branches]
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((branch, index) => ({
				...branch,
				sortOrder: branchSortStart + index,
			})),
		storeDefaults: guest.storeDefaults
			.filter((entry) => !accountDefaultKeys.has(entry.nameKey))
			.map((entry) => ({
				...entry,
				storeId: remapStoreId(entry.storeId) ?? entry.storeId,
			})),
		conversionMemories: guest.conversionMemories.filter(
			(memory) => !accountMemoryKeys.has(memory.key),
		),
		itemMemories: guest.itemMemories.filter(
			(memory) => !accountItemMemoryKeys.has(memory.nameKey),
		),
		mergedStoreCount: storeIdMap.size,
	};
}

// 移すものがあるか（購入済みの項目は、もう在庫に入った記録なので、それだけなら聞かない）。
export function hasShoppingMemoToAdopt(guest: ShoppingMemoData): boolean {
	return (
		guest.items.some((item) => item.status !== "purchased") ||
		guest.stores.length > 0 ||
		guest.branches.length > 0
	);
}
