import { useCallback, useEffect, useMemo, useState } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { userIdOfOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { loadIngredientDictionaryWithCache } from "../application/load-ingredient-dictionary-with-cache";
import type { IngredientDictionaryCommand } from "../application/manage-ingredient-dictionary";
import {
	createIngredientDictionary,
	type IngredientDictionary,
	type IngredientDictionaryEntry,
} from "../domain/ingredient-dictionary";
import { createDexieIngredientDictionaryCache } from "../infrastructure/dexie-ingredient-dictionary-cache";
import {
	listIngredientDictionaryServerFn,
	manageIngredientDictionaryServerFn,
} from "../server/ingredient-dictionary";

type LoadEntries = (
	ownerScope: `user:${string}`,
) => Promise<IngredientDictionaryEntry[]>;

function loadEntries(ownerScope: `user:${string}`) {
	return loadIngredientDictionaryWithCache(
		ownerScope,
		() =>
			listIngredientDictionaryServerFn({
				data: { expectedUserId: userIdOfOwnerScope(ownerScope) },
			}),
		createDexieIngredientDictionaryCache(),
	);
}

// 自分の食材辞書（照合と補完に使う）。ゲスト・読み込み前は undefined（カタログだけで動く）。
// 人が変わったら、前の人の辞書は、すぐに捨てる。reloadKey を変えると、読み直す（設定で書いたあと）。
export function useIngredientDictionary(
	ownerScope: InventoryPurchaseOwnerScope | null,
	{
		reloadKey = 0,
		load = loadEntries,
	}: { reloadKey?: number; load?: LoadEntries } = {},
): IngredientDictionary | undefined {
	const [loaded, setLoaded] = useState<{
		ownerScope: string;
		entries: IngredientDictionaryEntry[];
	} | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey は、読み直しの合図。
	useEffect(() => {
		if (!ownerScope || ownerScope === "guest") {
			setLoaded(null);

			return;
		}

		let isActive = true;

		load(ownerScope)
			.then((entries) => {
				if (isActive) {
					setLoaded({ ownerScope, entries });
				}
			})
			.catch(() => {
				// 辞書が読めなくても、カタログだけで動く。
			});

		return () => {
			isActive = false;
		};
	}, [ownerScope, reloadKey, load]);

	const entries =
		loaded && loaded.ownerScope === ownerScope ? loaded.entries : null;

	return useMemo(
		() => (entries ? createIngredientDictionary(entries) : undefined),
		[entries],
	);
}

// 辞書と、辞書を書き換える操作（材料を「管理しない」にする・「もしかして」の統合）。
// 送ったあと、辞書を読み直す（その辞書で、行の表示が変わる）。ゲストは、操作が undefined。
export function useIngredientDictionaryWithActions(
	ownerScope: InventoryPurchaseOwnerScope | null,
): {
	dictionary: IngredientDictionary | undefined;
	markUnmanaged: ((ingredientName: string) => Promise<void>) | undefined;
	mergeNames:
		| ((sourceName: string, targetName: string) => Promise<void>)
		| undefined;
} {
	const [reloadKey, setReloadKey] = useState(0);
	const dictionary = useIngredientDictionary(ownerScope, { reloadKey });
	const send = useCallback(
		async (command: IngredientDictionaryCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("ログインしていません");
			}

			await manageIngredientDictionaryServerFn({
				data: { expectedUserId: userIdOfOwnerScope(ownerScope), command },
			});
			setReloadKey((current) => current + 1);
		},
		[ownerScope],
	);
	const markUnmanaged = useCallback(
		(ingredientName: string) =>
			send({ kind: "mark-unmanaged-by-name", name: ingredientName }),
		[send],
	);
	const mergeNames = useCallback(
		(sourceName: string, targetName: string) =>
			send({ kind: "merge-names", sourceName, targetName }),
		[send],
	);
	const isLoggedIn = ownerScope !== null && ownerScope !== "guest";

	return {
		dictionary,
		markUnmanaged: isLoggedIn ? markUnmanaged : undefined,
		mergeNames: isLoggedIn ? mergeNames : undefined,
	};
}
