import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { Tag } from "#/components/tag/tag";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { adjustInventory as adjustInventoryServerFn } from "#/features/inventory/server/adjust-inventory";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";
import { registerInventoryItemServerFn } from "#/features/inventory/server/register-inventory-item";
import { undoRecipeConsumptionServerFn } from "#/features/inventory/server/undo-recipe-consumption";
import type {
	RecipeConsumptionEntryResult,
	RecipeConsumptionOperation,
} from "#/features/recipes/application/consume-recipe-ingredients";
import {
	runRecipeConsumption,
	undoRecipeConsumptionWithCache,
} from "#/features/recipes/application/consume-recipe-ingredients";
import type { RecipeDetail } from "#/features/recipes/application/recipe-repository";
import { RecipeConsumeSection } from "#/features/recipes/components/recipe-consume-section";
import { RecipeOwnerActions } from "#/features/recipes/components/recipe-owner-actions";
import { RecipePassphraseSection } from "#/features/recipes/components/recipe-passphrase-section";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipeShoppingSection } from "#/features/recipes/components/recipe-shopping-section";
import { RecipeUnlockForm } from "#/features/recipes/components/recipe-unlock-form";
import { RecipeViewWithLinks } from "#/features/recipes/components/recipe-view-with-links";
import { recipeVisibilityLabels } from "#/features/recipes/domain/recipe-visibility-label";
import { deleteRecipeServerFn } from "#/features/recipes/server/delete-recipe";
import { getLinkedRecipesServerFn } from "#/features/recipes/server/get-linked-recipes";
import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";
import {
	getRecipePassphraseServerFn,
	regenerateRecipePassphraseServerFn,
} from "#/features/recipes/server/recipe-passphrase";
import {
	unlockRecipeServerFn,
	viewRecipeServerFn,
} from "#/features/recipes/server/view-recipe";
import { ReportRecipeForm } from "#/features/reports/components/report-recipe-form";
import { ReportUserForm } from "#/features/reports/components/report-user-form";
import { createReportServerFn } from "#/features/reports/server/create-report";
import { createUserNameReportServerFn } from "#/features/reports/server/create-user-report";

export const Route = createFileRoute("/recipes/$publicId/")({
	// 見てはいけないレシピと、存在しないレシピは、どちらも null（パスフレーズの入力画面になる）。
	loader: ({ params }) =>
		viewRecipeServerFn({ data: { publicId: params.publicId } }),
	errorComponent: RecipeRouteError,
	component: RecipePage,
});

// 見る人によらない、画面の支え（リンク先の取得、在庫、「ある」の登録）。
function useRecipeViewSupport(recipe: RecipeDetail) {
	const ownerScope = useOwnerScope();

	// リンク先のレシピ（プレビューと、買い物メモへの展開で使う）。
	const loadLinkedRecipe = useCallback(
		(publicId: string) => getRecipeServerFn({ data: { publicId } }),
		[],
	);

	// 材料のリンク先を、リンク先の中のリンクもたどって、まとめて取る（材料の下に、その場で開く）。
	const loadLinkedRecipes = useCallback(
		(publicIds: string[]) => getLinkedRecipesServerFn({ data: { publicIds } }),
		[],
	);

	// 限定公開のパスフレーズ（持ち主だけ）。
	const loadPassphrase = useCallback(
		() => getRecipePassphraseServerFn({ data: { publicId: recipe.publicId } }),
		[recipe.publicId],
	);
	const regeneratePassphrase = useCallback(
		() =>
			regenerateRecipePassphraseServerFn({
				data: { publicId: recipe.publicId },
			}),
		[recipe.publicId],
	);

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

	// 「作った」：在庫から引く（キャッシュも更新）。
	const consume = useCallback(
		async (
			operation: RecipeConsumptionOperation,
			onlyNeedIds?: ReadonlySet<string>,
		): Promise<RecipeConsumptionEntryResult[]> => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫を操作できるユーザーではありません");
			}

			return runRecipeConsumption(
				ownerScope,
				operation,
				(command) => adjustInventoryServerFn({ data: command }),
				createDexieInventoryCacheRepository(),
				onlyNeedIds,
			);
		},
		[ownerScope],
	);

	const undoConsumption = useCallback(
		async (sourceId: string) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫を操作できるユーザーではありません");
			}

			return undoRecipeConsumptionWithCache(
				ownerScope,
				sourceId,
				(id) => undoRecipeConsumptionServerFn({ data: { sourceId: id } }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	return {
		ownerScope,
		loadLinkedRecipe,
		loadLinkedRecipes,
		loadPassphrase,
		regeneratePassphrase,
		loadInventoryItems,
		registerAvailable,
		consume,
		undoConsumption,
	};
}

function OwnRecipePage({ recipe }: { recipe: RecipeDetail }) {
	const navigate = useNavigate();
	const {
		ownerScope,
		loadLinkedRecipe,
		loadLinkedRecipes,
		loadPassphrase,
		regeneratePassphrase,
		loadInventoryItems,
		registerAvailable,
		consume,
		undoConsumption,
	} = useRecipeViewSupport(recipe);

	return (
		<>
			{/* 別のレシピへ移ったとき、開いているプレビューを、閉じる（key で、状態を作り直す）。 */}
			<RecipeViewWithLinks
				key={recipe.publicId}
				recipe={recipe}
				badges={
					<Tag
						tone={
							recipe.visibility === "public" || recipe.visibility === "unlisted"
								? "soft"
								: "default"
						}
					>
						{recipeVisibilityLabels[recipe.visibility ?? "private"]}
					</Tag>
				}
				loadLinkedRecipe={loadLinkedRecipe}
				loadLinkedRecipes={loadLinkedRecipes}
				renderOpenLink={(publicId) => (
					<Link to="/recipes/$publicId" params={{ publicId }}>
						レシピを開く
					</Link>
				)}
			/>
			{recipe.visibility === "unlisted" ? (
				<RecipePassphraseSection
					loadPassphrase={loadPassphrase}
					regeneratePassphrase={regeneratePassphrase}
				/>
			) : null}
			<RecipeShoppingSection
				ingredients={recipe.ingredients}
				linkViews={recipe.linkViews}
				loadLinkedRecipe={loadLinkedRecipe}
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				registerAvailable={registerAvailable}
			/>
			<RecipeConsumeSection
				recipePublicId={recipe.publicId}
				ingredients={recipe.ingredients}
				linkViews={recipe.linkViews}
				loadLinkedRecipe={loadLinkedRecipe}
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				consume={consume}
				undo={undoConsumption}
			/>
			<RecipeOwnerActions
				publicId={recipe.publicId}
				onDelete={async () => {
					await deleteRecipeServerFn({ data: { publicId: recipe.publicId } });
					await navigate({ to: "/recipes" });
				}}
			/>
		</>
	);
}

function SharedRecipePage({
	recipe,
	author,
}: {
	recipe: RecipeDetail;
	author: { name: string; handle: string };
}) {
	const {
		ownerScope,
		loadLinkedRecipe,
		loadLinkedRecipes,
		loadInventoryItems,
		registerAvailable,
		consume,
		undoConsumption,
	} = useRecipeViewSupport(recipe);

	return (
		<>
			<RecipeViewWithLinks
				key={recipe.publicId}
				recipe={recipe}
				badges={
					<Tag>
						作者：{author.name}（@{author.handle}）
					</Tag>
				}
				loadLinkedRecipe={loadLinkedRecipe}
				loadLinkedRecipes={loadLinkedRecipes}
				renderOpenLink={(publicId) => (
					<Link to="/recipes/$publicId" params={{ publicId }}>
						レシピを開く
					</Link>
				)}
			/>
			<RecipeShoppingSection
				ingredients={recipe.ingredients}
				linkViews={recipe.linkViews}
				loadLinkedRecipe={loadLinkedRecipe}
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				registerAvailable={registerAvailable}
			/>
			<RecipeConsumeSection
				recipePublicId={recipe.publicId}
				ingredients={recipe.ingredients}
				linkViews={recipe.linkViews}
				loadLinkedRecipe={loadLinkedRecipe}
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				consume={consume}
				undo={undoConsumption}
			/>
			<ReportUserForm
				onReport={(input) =>
					createUserNameReportServerFn({
						data: { handle: author.handle, ...input },
					})
				}
			/>
			<ReportRecipeForm
				onReport={(input) =>
					createReportServerFn({
						data: { recipePublicId: recipe.publicId, ...input },
					})
				}
			/>
		</>
	);
}

function RecipePage() {
	const viewable = Route.useLoaderData();
	const router = useRouter();
	const { publicId } = Route.useParams();

	if (!viewable) {
		return (
			<RecipeUnlockForm
				key={publicId}
				onUnlock={(passphrase) =>
					unlockRecipeServerFn({ data: { publicId, passphrase } })
				}
				onUnlocked={() => void router.invalidate()}
			/>
		);
	}

	return viewable.isOwn ? (
		<OwnRecipePage recipe={viewable.recipe} />
	) : (
		<SharedRecipePage recipe={viewable.recipe} author={viewable.author} />
	);
}
