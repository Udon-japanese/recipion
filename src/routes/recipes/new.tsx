import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as v from "valibot";
import { ButtonLink } from "#/components/button/button-link";
import { Note } from "#/components/note/note";
import { pageTitle } from "#/config/app";
import { IngredientDictionaryScope } from "#/features/ingredients/components/ingredient-dictionary-context";
import { useIngredientDictionaryWithActions } from "#/features/ingredients/hooks/use-ingredient-dictionary";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { createForkDocument } from "#/features/recipes/domain/create-fork-document";
import { createRecipeServerFn } from "#/features/recipes/server/create-recipe";
import { forkRecipeServerFn } from "#/features/recipes/server/fork-recipe";
import { getLinkedRecipesServerFn } from "#/features/recipes/server/get-linked-recipes";
import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";
import {
	listUserPublicRecipesServerFn,
	searchLinkableUsersServerFn,
} from "#/features/recipes/server/linkable-recipes";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";

// リンクできるレシピ（自分のレシピ）。
async function loadLinkTargets() {
	const recipes = await listRecipesServerFn();

	return recipes.map(({ publicId, name, createdAt }) => ({
		publicId,
		name,
		createdAt,
	}));
}

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

// 「このレシピをもとに作る」の親。継承できるのは、自分のレシピと、他の人の全体公開のレシピだけ（サーバーでも確かめる）。
async function loadForkSource(publicId: string | undefined) {
	if (publicId === undefined) {
		return null;
	}

	const parent = await getRecipeServerFn({ data: { publicId } }).catch(
		() => null,
	);

	if (!parent || (parent.author && parent.visibility !== "public")) {
		return { status: "unavailable" as const };
	}

	return {
		status: "ready" as const,
		publicId,
		name: parent.name,
		authorName: parent.author?.name ?? null,
		document: createForkDocument(parent),
	};
}

export const Route = createFileRoute("/recipes/new")({
	head: () => ({ meta: [{ title: pageTitle("レシピを登録") }] }),
	ssr: false,
	// from：もとにするレシピの公開 ID（「このレシピをもとに作る」）。
	validateSearch: v.object({
		from: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
	}),
	loaderDeps: ({ search }) => ({ from: search.from }),
	// リンクできるレシピは、前もって取る（ログインしていなければ、取らない）。
	loader: async ({ deps }) => {
		const [linkTargets, fork] = await Promise.all([
			loadLinkTargets().catch(() => undefined),
			loadForkSource(deps.from),
		]);

		return { linkTargets, fork };
	},
	component: NewRecipePage,
});

function NewRecipePage() {
	const ownerScope = useOwnerScope();
	// 自分の食材辞書（本文の材料の補完に、自分の材料も出す）。
	const { dictionary, mergeNames } =
		useIngredientDictionaryWithActions(ownerScope);
	const navigate = useNavigate();
	const { linkTargets, fork } = Route.useLoaderData();

	if (ownerScope === null) return null;

	if (ownerScope === "guest") {
		return <p>レシピを登録するにはログインしてください。</p>;
	}

	if (fork?.status === "unavailable") {
		return <p>もとにするレシピが見つかりません。</p>;
	}

	return (
		<IngredientDictionaryScope dictionary={dictionary} mergeNames={mergeNames}>
			{fork ? (
				<Note tone="info">
					{`${fork.authorName ? `${fork.authorName}さんの` : ""}『${fork.name}』をもとに作っています。保存すると、もとにしたレシピがレシピの画面に表示されます。`}
				</Note>
			) : null}
			<RecipeEditor
				key={fork?.publicId ?? "new"}
				initialDocument={fork?.document}
				forkedFrom={
					fork ? { name: fork.name, authorName: fork.authorName } : undefined
				}
				loadLinkedRecipe={loadLinkedRecipe}
				renderOpenLink={renderOpenLink}
				loadLinkedRecipes={loadLinkedRecipes}
				loadLinkTargets={loadLinkTargets}
				initialLinkTargets={linkTargets}
				searchLinkableUsers={(query) =>
					searchLinkableUsersServerFn({ data: { query } })
				}
				loadUserRecipes={(handle) =>
					listUserPublicRecipesServerFn({ data: { handle } })
				}
				onSave={(document) =>
					fork
						? forkRecipeServerFn({
								data: { parentPublicId: fork.publicId, document },
							})
						: createRecipeServerFn({ data: document })
				}
				onSaved={(recipe) =>
					void navigate({
						to: "/recipes/$publicId",
						params: { publicId: recipe.publicId },
					})
				}
			/>
		</IngredientDictionaryScope>
	);
}
