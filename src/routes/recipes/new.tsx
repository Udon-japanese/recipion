import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ButtonLink } from "#/components/button/button-link";
import { pageTitle } from "#/config/app";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { createRecipeServerFn } from "#/features/recipes/server/create-recipe";
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

export const Route = createFileRoute("/recipes/new")({
	head: () => ({ meta: [{ title: pageTitle("レシピを登録") }] }),
	ssr: false,
	// リンクできるレシピは、前もって取る（ログインしていなければ、取らない）。
	loader: async () => ({
		linkTargets: await loadLinkTargets().catch(() => undefined),
	}),
	component: NewRecipePage,
});

function NewRecipePage() {
	const ownerScope = useOwnerScope();
	const navigate = useNavigate();
	const { linkTargets } = Route.useLoaderData();

	if (ownerScope === null) return null;

	if (ownerScope === "guest") {
		return <p>レシピを登録するにはログインしてください。</p>;
	}

	return (
		<RecipeEditor
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
			onSave={(document) => createRecipeServerFn({ data: document })}
			onSaved={(recipe) =>
				void navigate({
					to: "/recipes/$publicId",
					params: { publicId: recipe.publicId },
				})
			}
		/>
	);
}
