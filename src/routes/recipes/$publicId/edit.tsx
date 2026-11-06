import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import * as v from "valibot";
import { ButtonLink } from "#/components/button/button-link";
import { Note } from "#/components/note/note";
import { pageTitle } from "#/config/app";
import { IngredientDictionaryScope } from "#/features/ingredients/components/ingredient-dictionary-context";
import { useIngredientDictionaryWithActions } from "#/features/ingredients/hooks/use-ingredient-dictionary";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { RecipeParentMerge } from "#/features/recipes/components/recipe-parent-merge";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { collectRecipeLinkTargetIds } from "#/features/recipes/domain/ingredient-link-target";
import {
	applyMergedSnapshot,
	mergeRecipeSnapshots,
} from "#/features/recipes/domain/merge-recipe-snapshot";
import type { RecipeEditorDocument } from "#/features/recipes/domain/recipe-editor-document";
import {
	createRecipeSnapshot,
	isParentChangedAgainError,
} from "#/features/recipes/domain/recipe-snapshot";
import { getLinkedRecipesServerFn } from "#/features/recipes/server/get-linked-recipes";
import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";
import {
	listUserPublicRecipesServerFn,
	searchLinkableUsersServerFn,
} from "#/features/recipes/server/linkable-recipes";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";
import { loadRecipe } from "#/features/recipes/server/load-recipe";
import {
	dismissParentChangesServerFn,
	getParentMergeSourceServerFn,
} from "#/features/recipes/server/parent-merge";
import { updateRecipeServerFn } from "#/features/recipes/server/update-recipe";

// 保存前の確認で押したリンクのプレビュー。編集中の内容を失わないよう、「レシピを開く」は、新しいタブで開く。
function loadLinkedRecipe(publicId: string) {
	return getRecipeServerFn({ data: { publicId } });
}

function loadLinkedRecipes(publicIds: string[]) {
	return getLinkedRecipesServerFn({ data: { publicIds } });
}

function renderOpenLink(publicId: string) {
	return (
		<ButtonLink
			to="/recipes/$publicId"
			params={{ publicId }}
			target="_blank"
			rel="noreferrer"
			variant="secondary"
			size="sm"
		>
			レシピを開く
		</ButtonLink>
	);
}

// 前もって取るリンク先の数の上限（getLinkedRecipesServerFn の入力の上限と同じ）。
const maxPreloadedLinkTargets = 30;

// リンクできるレシピ（自分のレシピ）。編集中のレシピ自身には、リンクできない。
async function loadLinkTargets(editingPublicId: string) {
	const recipes = await listRecipesServerFn();

	return recipes
		.filter((candidate) => candidate.publicId !== editingPublicId)
		.map(({ publicId, name, createdAt }) => ({ publicId, name, createdAt }));
}

export const Route = createFileRoute("/recipes/$publicId/edit")({
	// ブラウザ専用の処理が多い重い画面なので、サーバーでは描画しない（loader も、ブラウザで実行される）。
	ssr: false,
	// merge：もとのレシピの変更を取り込む（取り込みの画面のあとに、結果をエディタで開く）。
	validateSearch: v.object({
		merge: v.optional(v.boolean()),
	}),
	loaderDeps: ({ search }) => ({ merge: search.merge ?? false }),
	// リンクできるレシピと、保存済みの本文のリンク先も、前もって取る（保存前の確認のプレビューで、すぐに出す）。
	loader: async ({ params, deps }) => {
		const { recipe, revision } = await loadRecipe(params.publicId);
		const linkTargetIds = collectRecipeLinkTargetIds(recipe).slice(
			0,
			maxPreloadedLinkTargets,
		);
		const [linkTargets, linkedRecipes, mergeSource] = await Promise.all([
			loadLinkTargets(recipe.publicId),
			linkTargetIds.length > 0
				? getLinkedRecipesServerFn({ data: { publicIds: linkTargetIds } })
				: {},
			deps.merge
				? getParentMergeSourceServerFn({ data: { publicId: params.publicId } })
				: Promise.resolve(null),
		]);

		return {
			recipe,
			revision,
			linkTargets,
			linkedRecipes,
			merge: deps.merge
				? mergeSource
					? {
							source: mergeSource,
							sections: mergeRecipeSnapshots({
								base: mergeSource.base,
								parent: mergeSource.current,
								mine: createRecipeSnapshot(recipe),
							}),
						}
					: { source: null, sections: [] }
				: null,
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: pageTitle(
					loaderData ? `${loaderData.recipe.name}を編集` : "レシピを編集",
				),
			},
		],
	}),
	errorComponent: RecipeRouteError,
	notFoundComponent: RecipeNotFound,
	component: EditRecipePage,
});

function RecipeNotFound() {
	return (
		<>
			<p>レシピが見つかりません。</p>
			<Link to="/recipes">レシピ一覧へ</Link>
		</>
	);
}

function EditRecipePage() {
	const { recipe, revision, linkTargets, linkedRecipes, merge } =
		Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	// 取り込んだ結果のレシピ（取り込みの画面で「エディタで開く」を押したあと）。
	const [merged, setMerged] = useState<RecipeEditorDocument | null>(null);
	// 親がまた変わって、最新の内容で比べ直した回数（取り込みの画面の選び直しと、知らせに使う）。
	const [reloadCount, setReloadCount] = useState(0);
	// 最新の内容を取り直している最中（古い内容は見せず、読み込み中の知らせを出す）。
	const [isReloading, setIsReloading] = useState(false);

	// 比べたあとに親がまた変わっていたら（サーバーが断る）、すぐに読み込み中の知らせに替え、
	// 最新の内容を取り直して、取り込みの画面に戻る。
	async function reloadAfterParentChanged() {
		setIsReloading(true);
		setMerged(null);
		setReloadCount((count) => count + 1);

		try {
			await router.invalidate();
		} finally {
			setIsReloading(false);
		}
	}
	const backToRecipe = () =>
		void navigate({
			to: "/recipes/$publicId",
			params: { publicId: recipe.publicId },
		});
	// 自分の食材辞書（本文の材料の補完に、自分の材料も出す）。
	const { dictionary, mergeNames } = useIngredientDictionaryWithActions(
		useOwnerScope(),
	);
	// 保存のたびに、新しい版に進める（保存に失敗して、この画面に残ったときも、次の保存で確かめられるように）。
	const revisionRef = useRef(revision);

	if (isReloading) {
		return (
			<Note tone="info" spinning>
				もとのレシピが、また変わりました。最新の内容を読み込んでいます…
			</Note>
		);
	}

	if (merge && merged === null) {
		if (!merge.source || merge.sections.length === 0) {
			return (
				<>
					<p>取り込める変更はありません。</p>
					<Link to="/recipes/$publicId" params={{ publicId: recipe.publicId }}>
						レシピへ戻る
					</Link>
				</>
			);
		}

		const source = merge.source;

		return (
			<RecipeParentMerge
				key={reloadCount}
				notice={
					reloadCount > 0
						? "もとのレシピが、また変わりました。最新の内容で、比べ直しました。"
						: null
				}
				parentName={source.parentName}
				parentAuthorName={source.parentAuthorName}
				merges={merge.sections}
				onOpenEditor={(resolved) =>
					setMerged(
						applyMergedSnapshot(recipe, {
							...createRecipeSnapshot(recipe),
							...resolved,
						}),
					)
				}
				onDismiss={async () => {
					try {
						await dismissParentChangesServerFn({
							data: {
								publicId: recipe.publicId,
								parentSnapshot: source.current,
							},
						});
					} catch (error) {
						if (isParentChangedAgainError(error)) {
							// 待たずに、すぐ読み込み中の知らせに替える。
							void reloadAfterParentChanged();

							return;
						}

						throw error;
					}

					backToRecipe();
				}}
				onCancel={backToRecipe}
			/>
		);
	}

	return (
		<IngredientDictionaryScope dictionary={dictionary} mergeNames={mergeNames}>
			{merged ? (
				<Note tone="info">
					もとのレシピの変更を取り込んだ内容です。確かめて保存すると、取り込みが終わります。
				</Note>
			) : null}
			<RecipeEditor
				key={merged ? "merged" : "saved"}
				initialDocument={merged ?? recipe}
				publicId={recipe.publicId}
				loadLinkedRecipe={loadLinkedRecipe}
				renderOpenLink={renderOpenLink}
				loadLinkedRecipes={loadLinkedRecipes}
				searchLinkableUsers={(query) =>
					searchLinkableUsersServerFn({ data: { query } })
				}
				loadUserRecipes={(handle) =>
					listUserPublicRecipesServerFn({ data: { handle } })
				}
				loadLinkTargets={() => loadLinkTargets(recipe.publicId)}
				initialLinkTargets={linkTargets}
				preloadedLinkedRecipes={linkedRecipes}
				missingLinkLabels={recipe.linkViews.flatMap((view) =>
					view.target ? [] : [view.label],
				)}
				onSave={async (document, { overwrite }) => {
					try {
						const saved = await updateRecipeServerFn({
							data: {
								publicId: recipe.publicId,
								document,
								expectedRevision: overwrite ? null : revisionRef.current,
								// 取り込んだ結果を保存するときは、写しを、取り込んだ親の中身にする。
								...(merged && merge?.source
									? { parentSnapshot: merge.source.current }
									: {}),
							},
						});

						revisionRef.current = saved.revision;

						return saved;
					} catch (error) {
						// 取り込んだ結果の保存で、親がまた変わっていたら、最新の内容で比べ直す。
						if (merged && isParentChangedAgainError(error)) {
							// 待たずに、すぐ読み込み中の知らせに替える（エディタは閉じる）。
							void reloadAfterParentChanged();
						}

						throw error;
					}
				}}
				onSaved={backToRecipe}
			/>
		</IngredientDictionaryScope>
	);
}
