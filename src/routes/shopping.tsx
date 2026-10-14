import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { PurchaseOutboxSync } from "#/features/inventory/components/purchase-outbox-sync";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";
import { registerInventoryItemServerFn } from "#/features/inventory/server/register-inventory-item";
import { RecipeToShoppingPicker } from "#/features/recipes/components/recipe-to-shopping-picker";
import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";
import type { RecipePickerContext } from "#/features/shopping/components/recipe-picker-slot";
import { ShoppingList } from "#/features/shopping/components/shopping-list";

export const Route = createFileRoute("/shopping")({
	ssr: false,
	component: ShoppingPage,
});

function ShoppingPage() {
	const ownerScope = useOwnerScope();
	const isLoggedIn = ownerScope !== null && ownerScope !== "guest";

	// 自分のレシピの一覧（「レシピから入れる」で選ぶ）。
	const listRecipes = useCallback(async () => {
		const recipes = await listRecipesServerFn();

		return recipes.map(({ publicId, name, createdAt }) => ({
			publicId,
			name,
			createdAt,
		}));
	}, []);

	const loadRecipe = useCallback(
		(publicId: string) => getRecipeServerFn({ data: { publicId } }),
		[],
	);

	// 在庫の一覧（通信できなければ、保存済みの一覧）。
	const loadInventoryItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			throw new Error("在庫を取得できるユーザーではありません");
		}

		const result = await loadInventoryItemsWithCache(
			ownerScope,
			() => listInventoryItemsServerFn(),
			createDexieInventoryCacheRepository(),
		);

		return result.items;
	}, [ownerScope]);

	// 塩・醤油のように、量を追わない食材を、「ある」で登録する。
	const registerAvailable = useCallback(async (ingredientName: string) => {
		const entry = findIngredientCatalogEntry(ingredientName);
		const stockUnitCode = entry?.stockUnitCode ?? "count";

		await registerInventoryItemServerFn({
			data: {
				transactionId: crypto.randomUUID(),
				ingredientName,
				stockUnitCode,
				stockUnitLabel: getDefaultStockUnitLabel(stockUnitCode),
				trackingMode: entry?.defaultTrackingMode ?? "estimated",
				initialQuantity: 0,
				markAsAvailable: true,
			},
		});
	}, []);

	return (
		<ShoppingList
			ownerScope={ownerScope}
			notices={
				<PurchaseOutboxSync
					ownerScope={ownerScope}
					syncPurchases={syncDexieInventoryPurchaseOutbox}
				/>
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
							/>
						)
					: undefined
			}
		/>
	);
}
