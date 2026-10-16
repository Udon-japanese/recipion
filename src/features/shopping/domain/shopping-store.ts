import * as v from "valibot";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import type { ShoppingBranch } from "./shopping-branch";
import type { ShoppingItem } from "./shopping-item";

export const maxShoppingStoreCount = 20;
export const maxShoppingStoreNameLength = 30;

export type ShoppingStore = {
	id: string;
	name: string;
	sortOrder: number;
	createdAt: string;
};

const shoppingStoreNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "店の名前を入力してください"),
	v.maxLength(
		maxShoppingStoreNameLength,
		`店の名前は${maxShoppingStoreNameLength}文字までにしてください`,
	),
);

export function createShoppingStore(
	name: string,
	sortOrder: number,
	now = new Date(),
	id: string = crypto.randomUUID(),
): ShoppingStore {
	return {
		id,
		name: v.parse(shoppingStoreNameSchema, name),
		sortOrder,
		createdAt: now.toISOString(),
	};
}

export function renameShoppingStore(
	store: ShoppingStore,
	name: string,
): ShoppingStore {
	return { ...store, name: v.parse(shoppingStoreNameSchema, name) };
}

// 同じ名前（前後の空白・全角半角・大文字小文字の違いを除く）の店が、すでにあるか。
export function hasShoppingStoreNamed(
	stores: readonly ShoppingStore[],
	name: string,
	exceptStoreId?: string,
): boolean {
	const key = toStoreNameKey(name);

	return stores.some(
		(store) => store.id !== exceptStoreId && toStoreNameKey(store.name) === key,
	);
}

function toStoreNameKey(name: string): string {
	return name.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
}

// 「いつも買う店」を覚えるときの、食材名のキー。空の名前は、覚えない。
export function toStoreDefaultKey(itemName: string): string | null {
	return itemName.trim() === "" ? null : normalizeIngredientName(itemName);
}

export type ShoppingStoreGroup = {
	// null は「どこでも」（店を決めていない項目）。
	store: ShoppingStore | null;
	items: ShoppingItem[];
	// この店の、条件つきのメモ（条件の材料の店で決める）。
	branches: ShoppingBranch[];
};

// 条件つきのメモと、その店（条件の材料の店。決まっていなければ null）。
export type ShoppingBranchPlacement = {
	branch: ShoppingBranch;
	storeId: string | null;
};

// 店ごとにまとめる。店は並び順で、「どこでも」は最後。項目の順番は、一覧の順番のまま。
// 条件つきのメモは、条件の材料の店に入れる。項目も、条件つきのメモも、ない店は出さない。
// 店が見つからない（削除された店）ものは、「どこでも」に入れる。
export function groupShoppingByStore(
	items: readonly ShoppingItem[],
	branches: readonly ShoppingBranchPlacement[],
	stores: readonly ShoppingStore[],
): ShoppingStoreGroup[] {
	const storesById = new Map(stores.map((store) => [store.id, store]));
	const keyOf = (storeId: string | null) =>
		storeId && storesById.has(storeId) ? storeId : null;
	const groupsByKey = new Map<string | null, ShoppingStoreGroup>();

	function groupFor(key: string | null): ShoppingStoreGroup {
		const existing = groupsByKey.get(key);

		if (existing) {
			return existing;
		}

		const group: ShoppingStoreGroup = {
			store: key ? (storesById.get(key) ?? null) : null,
			items: [],
			branches: [],
		};

		groupsByKey.set(key, group);

		return group;
	}

	for (const item of items) {
		groupFor(keyOf(item.storeId)).items.push(item);
	}

	for (const { branch, storeId } of branches) {
		groupFor(keyOf(storeId)).branches.push(branch);
	}

	const storeGroups = [...stores]
		.sort((first, second) => first.sortOrder - second.sortOrder)
		.flatMap((store) => {
			const group = groupsByKey.get(store.id);

			return group ? [group] : [];
		});
	const anywhere = groupsByKey.get(null);

	return anywhere ? [...storeGroups, anywhere] : storeGroups;
}
