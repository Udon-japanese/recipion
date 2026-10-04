import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";
import { registerInventoryItemServerFn } from "#/features/inventory/server/register-inventory-item";
import { RecipeDeleteButton } from "#/features/recipes/components/recipe-delete-button";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipeShoppingSection } from "#/features/recipes/components/recipe-shopping-section";
import { RecipeView } from "#/features/recipes/components/recipe-view";
import { deleteRecipeServerFn } from "#/features/recipes/server/delete-recipe";
import { loadRecipe } from "#/features/recipes/server/load-recipe";

export const Route = createFileRoute("/recipes/$publicId/")({
	loader: ({ params }) => loadRecipe(params.publicId),
	errorComponent: RecipeRouteError,
	notFoundComponent: RecipeNotFound,
	component: RecipePage,
});

function RecipeNotFound() {
	return (
		<>
			<p>レシピが見つかりません。</p>
			<Link to="/recipes">レシピ一覧へ</Link>
		</>
	);
}

function RecipePage() {
	const recipe = Route.useLoaderData();
	const navigate = useNavigate();
	const ownerScope = useOwnerScope();

	// ログインしているとき、在庫の一覧を取得する（通信できなければ、保存済みの一覧）。
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
		<>
			<RecipeView recipe={recipe} />
			<RecipeShoppingSection
				ingredients={recipe.ingredients}
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				registerAvailable={registerAvailable}
			/>
			<p>
				<Link
					to="/recipes/$publicId/edit"
					params={{ publicId: recipe.publicId }}
				>
					編集
				</Link>
			</p>
			<RecipeDeleteButton
				onDelete={async () => {
					await deleteRecipeServerFn({ data: { publicId: recipe.publicId } });
					await navigate({ to: "/recipes" });
				}}
			/>
			<p>
				<Link to="/recipes">レシピ一覧へ</Link>
			</p>
		</>
	);
}
