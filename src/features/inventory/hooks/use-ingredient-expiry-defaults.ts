import { useCallback, useEffect, useState } from "react";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryListItem } from "../application/inventory-query-repository";
import {
	findInventoryItemByName,
	type IngredientExpiryDefaults,
} from "../domain/build-expiry-prefill";
import { createDexieInventoryCacheRepository } from "../infrastructure/dexie-inventory-cache-repository";

// ユーザーが決めた、食材ごとの期限の種類・保存方法を、保存済みの在庫（ブラウザのキャッシュ）から探す関数を返す。
// ログインしていない、または、まだ在庫を読み込んでいないときは、見つからない（null）。
export function useIngredientExpiryDefaults(
	ownerScope: InventoryPurchaseOwnerScope | null,
): (ingredientName: string) => IngredientExpiryDefaults | null {
	const [items, setItems] = useState<readonly InventoryListItem[]>([]);

	useEffect(() => {
		if (!ownerScope || ownerScope === "guest") {
			setItems([]);

			return;
		}

		let isActive = true;

		createDexieInventoryCacheRepository()
			.find(ownerScope)
			.then((snapshot) => {
				if (isActive) {
					setItems(snapshot?.items ?? []);
				}
			})
			.catch(() => {
				// キャッシュが読めなくても、初期値なしで動く。
			});

		return () => {
			isActive = false;
		};
	}, [ownerScope]);

	return useCallback(
		(ingredientName: string) => {
			const item = findInventoryItemByName(items, ingredientName);

			if (!item || (!item.defaultExpiryKind && !item.defaultStorage)) {
				return null;
			}

			return {
				expiryKind: item.defaultExpiryKind,
				storage: item.defaultStorage,
			};
		},
		[items],
	);
}
