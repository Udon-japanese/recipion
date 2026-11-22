import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { pageTitle } from "#/config/app";
import { IngredientDictionaryScope } from "#/features/ingredients/components/ingredient-dictionary-context";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { useIngredientDictionaryWithActions } from "#/features/ingredients/hooks/use-ingredient-dictionary";
import { userIdOfOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { PurchaseOutboxSync } from "#/features/inventory/components/purchase-outbox-sync";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import * as inventoryApi from "#/features/inventory/infrastructure/inventory-api";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { RecipeToShoppingPicker } from "#/features/recipes/components/recipe-to-shopping-picker";
import * as recipesApi from "#/features/recipes/infrastructure/recipes-api";
import { getHouseholdSizeServerFn } from "#/features/recipes/server/household-size";
import { GuestShoppingMemoAdoption } from "#/features/shopping/components/guest-shopping-memo-adoption";
import type { RecipePickerContext } from "#/features/shopping/components/recipe-picker-slot";
import { ShoppingList } from "#/features/shopping/components/shopping-list";
import { ShoppingSyncNotice } from "#/features/shopping/components/shopping-sync-notice";
import { useShoppingOwnerScope } from "#/features/shopping/hooks/use-shopping-owner-scope";

export const Route = createFileRoute("/shopping")({
	head: () => ({ meta: [{ title: pageTitle("買い物メモ") }] }),
	ssr: false,
	component: ShoppingPage,
});

// うちの人数（「人分」のレシピは、この人数の量で入れる）。画面の外に置く（いつも同じ関数）。
function loadHouseholdSize() {
	return getHouseholdSizeServerFn();
}

function ShoppingPage() {
	// オフラインでログイン状態を確かめられないときも、この端末でログインしている人のメモを見せる。
	const ownerScope = useShoppingOwnerScope();
	const isLoggedIn = ownerScope !== null && ownerScope !== "guest";
	// 自分の食材辞書（レシピから入れるときの照合と、名前の補完に使う）。ゲストは undefined。
	const { dictionary, markUnmanaged, mergeNames } =
		useIngredientDictionaryWithActions(ownerScope);

	// 自分のレシピの一覧（「レシピから入れる」で選ぶ）。
	const listRecipes = useCallback(async () => {
		const recipes = await recipesApi.listRecipes();

		return recipes.map(({ publicId, name, createdAt }) => ({
			publicId,
			name,
			createdAt,
		}));
	}, []);

	const loadRecipe = useCallback(
		(publicId: string) => recipesApi.getRecipe({ publicId }),
		[],
	);

	// 在庫の一覧（通信できなければ、保存済みの一覧）。
	const loadInventoryItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			throw new Error("在庫を取得できるユーザーではありません");
		}

		const result = await loadInventoryItemsWithCache(
			ownerScope,
			() =>
				inventoryApi.listInventoryItems({
					expectedUserId: userIdOfOwnerScope(ownerScope),
				}),
			createDexieInventoryCacheRepository(),
		);

		return result.items;
	}, [ownerScope]);

	// 塩・醤油のように、量を追わない食材を、「ある」で登録する。
	const registerAvailable = useCallback(
		async (ingredientName: string) => {
			const entry = findIngredientCatalogEntry(ingredientName);
			const stockUnitCode = entry?.stockUnitCode ?? "count";

			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫に登録できるユーザーではありません");
			}

			await inventoryApi.registerInventoryItem({
				expectedUserId: userIdOfOwnerScope(ownerScope),
				transactionId: crypto.randomUUID(),
				ingredientName,
				stockUnitCode,
				stockUnitLabel: getDefaultStockUnitLabel(stockUnitCode),
				trackingMode: entry?.defaultTrackingMode ?? "estimated",
				initialQuantity: 0,
				markAsAvailable: true,
			});
		},
		[ownerScope],
	);

	// だれのメモかが決まるまでは、出さない（ゲストのメモを、一瞬でも見せない）。
	if (ownerScope === null) {
		return null;
	}

	return (
		<IngredientDictionaryScope dictionary={dictionary} mergeNames={mergeNames}>
			<ShoppingList
				key={ownerScope}
				ownerScope={ownerScope}
				notices={
					<>
						<PurchaseOutboxSync
							ownerScope={ownerScope}
							syncPurchases={syncDexieInventoryPurchaseOutbox}
						/>
						<GuestShoppingMemoAdoption ownerScope={ownerScope} />
						<ShoppingSyncNotice ownerScope={ownerScope} />
					</>
				}
				syncPurchases={syncDexieInventoryPurchaseOutbox}
				renderRecipePicker={
					isLoggedIn
						? (context: RecipePickerContext) => (
								<RecipeToShoppingPicker
									context={context}
									ownerScope={ownerScope}
									listRecipes={listRecipes}
									loadRecipe={loadRecipe}
									loadInventoryItems={loadInventoryItems}
									registerAvailable={registerAvailable}
									loadHouseholdSize={loadHouseholdSize}
									markUnmanaged={markUnmanaged}
									dictionary={dictionary}
								/>
							)
						: undefined
				}
			/>
		</IngredientDictionaryScope>
	);
}
