import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { ButtonLink } from "#/components/button/button-link";
import { Tag } from "#/components/tag/tag";
import { pageTitle } from "#/config/app";
import type { Avatar } from "#/features/avatar/domain/avatar";
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
import { stockMadeRecipeServerFn } from "#/features/inventory/server/stock-made-recipe";
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
import { RecipeAuthorByline } from "#/features/recipes/components/recipe-author-byline";
import { RecipeConsumeSection } from "#/features/recipes/components/recipe-consume-section";
import * as styles from "#/features/recipes/components/recipe-detail-page.css";
import { RecipeKeepAwake } from "#/features/recipes/components/recipe-keep-awake";
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
import { ReportMenu } from "#/features/reports/components/report-menu";
import { createReportServerFn } from "#/features/reports/server/create-report";
import { createUserNameReportServerFn } from "#/features/reports/server/create-user-report";

export const Route = createFileRoute("/recipes/$publicId/")({
	// 見てはいけないレシピと、存在しないレシピは、どちらも null（パスフレーズの入力画面になる）。
	loader: ({ params }) =>
		viewRecipeServerFn({ data: { publicId: params.publicId } }),
	head: ({ loaderData }) => ({
		meta: [
			{
				title: pageTitle(
					loaderData
						? `${loaderData.isOwn ? "" : `${loaderData.author.name}の`}${loaderData.recipe.name}`
						: "レシピ",
				),
			},
		],
	}),
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

	// 作り置きのレシピ：「作った」で、できあがりを在庫に入れる（一覧は、次に開くときに、サーバーから取り直す）。
	const produce = useCallback(
		async (input: { sourceId: string; transactionId: string }) => {
			await stockMadeRecipeServerFn({
				data: { recipePublicId: recipe.publicId, ...input },
			});
		},
		[recipe.publicId],
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
		produce,
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
		produce,
	} = useRecipeViewSupport(recipe);

	return (
		<div className={styles.page}>
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
				actions={
					<RecipeOwnerActions
						publicId={recipe.publicId}
						onDelete={async () => {
							await deleteRecipeServerFn({
								data: { publicId: recipe.publicId },
							});
							await navigate({ to: "/recipes" });
						}}
					/>
				}
				headerExtra={
					recipe.visibility === "unlisted" ? (
						<RecipePassphraseSection
							loadPassphrase={loadPassphrase}
							regeneratePassphrase={regeneratePassphrase}
						/>
					) : null
				}
				instructionsAction={<RecipeKeepAwake />}
				loadLinkedRecipe={loadLinkedRecipe}
				loadLinkedRecipes={loadLinkedRecipes}
				renderOpenLink={renderOpenLink}
			/>
			<div className={styles.actions}>
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
					madeRecipe={{
						name: recipe.name,
						defaultChecked: recipe.stocksWhenMade ?? false,
						produce,
					}}
				/>
			</div>
		</div>
	);
}

function SharedRecipePage({
	recipe,
	author,
}: {
	recipe: RecipeDetail;
	author: { name: string; handle: string; avatar: Avatar };
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
		<div className={styles.page}>
			<RecipeViewWithLinks
				key={recipe.publicId}
				recipe={recipe}
				badges={
					<RecipeAuthorByline
						name={author.name}
						handle={author.handle}
						avatar={author.avatar}
					/>
				}
				actions={
					<ReportMenu
						onReportRecipe={(input) =>
							createReportServerFn({
								data: { recipePublicId: recipe.publicId, ...input },
							})
						}
						onReportUser={(input) =>
							createUserNameReportServerFn({
								data: { handle: author.handle, ...input },
							})
						}
					/>
				}
				instructionsAction={<RecipeKeepAwake />}
				loadLinkedRecipe={loadLinkedRecipe}
				loadLinkedRecipes={loadLinkedRecipes}
				renderOpenLink={renderOpenLink}
			/>
			<div className={styles.actions}>
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
			</div>
		</div>
	);
}

// リンク先のプレビューの「レシピを開く」。
function renderOpenLink(publicId: string) {
	return (
		<ButtonLink
			to="/recipes/$publicId"
			params={{ publicId }}
			variant="secondary"
			size="sm"
		>
			レシピを開く
		</ButtonLink>
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
