import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { createRecipeServerFn } from "#/features/recipes/server/create-recipe";

export const Route = createFileRoute("/recipes/new")({
	component: NewRecipePage,
});

function NewRecipePage() {
	const ownerScope = useOwnerScope();
	const navigate = useNavigate();

	if (ownerScope === null) return null;

	if (ownerScope === "guest") {
		return <p>レシピを登録するにはログインしてください。</p>;
	}

	return (
		<RecipeEditor
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
