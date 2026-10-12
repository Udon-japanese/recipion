import { useEffect, useState } from "react";
import type { ShoppingStoreRepository } from "../application/shopping-store-repository";
import { getShoppingErrorMessage } from "../components/shopping-error-message";
import {
	createShoppingStore,
	hasShoppingStoreNamed,
	maxShoppingStoreCount,
	renameShoppingStore,
	type ShoppingStore,
	toStoreDefaultKey,
} from "../domain/shopping-store";
import { upsertById } from "../domain/upsert-by-id";

type UseShoppingStoresOptions = {
	repository: ShoppingStoreRepository;
	onError: (message: string | null) => void;
	// 店を消したあと、画面の項目の店を「どこでも」に戻す。
	onStoreRemoved: (storeId: string) => void;
};

// 買う店の一覧と、食材ごとの「いつも買う店」の記憶。
export function useShoppingStores({
	repository,
	onError,
	onStoreRemoved,
}: UseShoppingStoresOptions) {
	const [stores, setStores] = useState<ShoppingStore[]>([]);
	const [defaults, setDefaults] = useState<Record<string, string>>({});

	useEffect(() => {
		let isActive = true;
		let unsubscribe: (() => void) | undefined;

		function handleError() {
			if (isActive) {
				onError("買う店の一覧を読み込めませんでした");
			}
		}

		// 店の一覧は、購読できる保存先なら、別のタブからの変更も受け取る。
		if (repository.watch) {
			unsubscribe = repository.watch((loadedStores) => {
				if (isActive) {
					setStores(loadedStores);
				}
			}, handleError);
		} else {
			repository.list().then((loadedStores) => {
				if (isActive) {
					setStores(loadedStores);
				}
			}, handleError);
		}

		repository.listDefaults().then((loadedDefaults) => {
			if (isActive) {
				setDefaults(loadedDefaults);
			}
		}, handleError);

		return () => {
			isActive = false;
			unsubscribe?.();
		};
	}, [repository, onError]);

	// 店を足す。成功したら、その店を返す。
	async function addStore(name: string): Promise<ShoppingStore | null> {
		onError(null);

		try {
			if (stores.length >= maxShoppingStoreCount) {
				throw new Error("limit");
			}

			if (hasShoppingStoreNamed(stores, name)) {
				onError("同じ名前の店がすでにあります");

				return null;
			}

			const nextSortOrder =
				stores.reduce(
					(highest, store) => Math.max(highest, store.sortOrder),
					-1,
				) + 1;
			const store = createShoppingStore(name, nextSortOrder);

			await repository.save(store);
			setStores((current) => upsertById(current, store));

			return store;
		} catch (error) {
			onError(
				stores.length >= maxShoppingStoreCount
					? `店は${maxShoppingStoreCount}件までです`
					: getShoppingErrorMessage(error),
			);

			return null;
		}
	}

	async function renameStore(
		store: ShoppingStore,
		name: string,
	): Promise<boolean> {
		onError(null);

		try {
			if (hasShoppingStoreNamed(stores, name, store.id)) {
				onError("同じ名前の店がすでにあります");

				return false;
			}

			const renamed = renameShoppingStore(store, name);

			await repository.save(renamed);
			setStores((current) =>
				current.map((entry) => (entry.id === renamed.id ? renamed : entry)),
			);

			return true;
		} catch (error) {
			onError(getShoppingErrorMessage(error));

			return false;
		}
	}

	async function removeStore(store: ShoppingStore): Promise<boolean> {
		onError(null);

		try {
			await repository.remove(store.id);
			setStores((current) => current.filter((entry) => entry.id !== store.id));
			setDefaults((current) =>
				Object.fromEntries(
					Object.entries(current).filter(([, storeId]) => storeId !== store.id),
				),
			);
			onStoreRemoved(store.id);

			return true;
		} catch (error) {
			onError(getShoppingErrorMessage(error));

			return false;
		}
	}

	// 食材名に対して、いつも買う店（なければ null）。
	function defaultStoreIdFor(itemName: string): string | null {
		const key = toStoreDefaultKey(itemName);
		const storeId = key ? defaults[key] : undefined;

		return storeId && stores.some((store) => store.id === storeId)
			? storeId
			: null;
	}

	// 買う店を決めたとき、次から同じ食材の初期値にするため、覚える（null なら忘れる）。記憶の失敗は、操作を止めない。
	async function rememberStore(itemName: string, storeId: string | null) {
		const key = toStoreDefaultKey(itemName);

		if (!key) {
			return;
		}

		try {
			await repository.setDefault(key, storeId);
			setDefaults((current) => {
				if (storeId === null) {
					const { [key]: _removed, ...rest } = current;

					return rest;
				}

				return { ...current, [key]: storeId };
			});
		} catch {
			// 記憶できなくても、買い物メモの操作は成功させる。
		}
	}

	return {
		stores,
		addStore,
		renameStore,
		removeStore,
		defaultStoreIdFor,
		rememberStore,
	};
}
