import { useEffect, useState } from "react";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { toDateString } from "#/features/inventory/domain/inventory-lot";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";
import { useShoppingOwnerScope } from "#/features/shopping/hooks/use-shopping-owner-scope";
import { createDexieShoppingRepository } from "#/features/shopping/infrastructure/dexie-shopping-repository";
import {
	type ExpirySummary,
	summarizeExpiry,
} from "../domain/summarize-expiry";

export type CountState<T> =
	| { status: "loading" }
	| { status: "ready"; value: T }
	| { status: "error" };

const loading = { status: "loading" } as const;

// 買い物メモの残り（その持ち主のメモ。購入済みと、条件つきのメモの中の項目は数えない）。持ち主が決まるまでは、読み込み中。
export function useShoppingRemaining(): CountState<number> {
	const ownerScope = useShoppingOwnerScope();
	const [state, setState] = useState<CountState<number>>(loading);

	useEffect(() => {
		if (ownerScope === null) {
			setState(loading);

			return;
		}

		const unsubscribe = createDexieShoppingRepository(ownerScope).watch(
			(items) =>
				setState({
					status: "ready",
					value: items.filter(
						(item) => !item.branchId && item.status !== "purchased",
					).length,
				}),
			() => setState({ status: "error" }),
		);

		return unsubscribe;
	}, [ownerScope]);

	return state;
}

// 在庫の、期限が近い食材（通信できなければ、保存済みの一覧）。
export function useInventoryExpiry(
	userId: string | null,
): CountState<ExpirySummary> {
	const [state, setState] = useState<CountState<ExpirySummary>>(loading);

	useEffect(() => {
		if (userId === null) {
			return;
		}

		let cancelled = false;

		setState(loading);
		loadInventoryItemsWithCache(
			`user:${userId}`,
			() => listInventoryItemsServerFn({ data: { expectedUserId: userId } }),
			createDexieInventoryCacheRepository(),
		).then(
			(result) => {
				if (!cancelled) {
					setState({
						status: "ready",
						value: summarizeExpiry(result.items, toDateString(new Date())),
					});
				}
			},
			() => {
				if (!cancelled) {
					setState({ status: "error" });
				}
			},
		);

		return () => {
			cancelled = true;
		};
	}, [userId]);

	return state;
}

// 自分のレシピの数。
export function useRecipeCount(userId: string | null): CountState<number> {
	const [state, setState] = useState<CountState<number>>(loading);

	useEffect(() => {
		if (userId === null) {
			return;
		}

		let cancelled = false;

		setState(loading);
		listRecipesServerFn().then(
			(recipes) => {
				if (!cancelled) {
					setState({ status: "ready", value: recipes.length });
				}
			},
			() => {
				if (!cancelled) {
					setState({ status: "error" });
				}
			},
		);

		return () => {
			cancelled = true;
		};
	}, [userId]);

	return state;
}
