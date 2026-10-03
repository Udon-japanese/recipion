import type { ParsedRecipeIngredientNode } from "./parse-recipe-ingredients";

export type RecipeEditorSuggestion = {
	type: "group" | "ingredient";
	label: string;
};

function normalizeSuggestionText(value: string): string {
	return value.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
}

export function getRecipeEditorSuggestions(
	nodes: readonly ParsedRecipeIngredientNode[],
	query = "",
): RecipeEditorSuggestion[] {
	const suggestions: RecipeEditorSuggestion[] = [];
	const registeredLabels = new Set<string>();

	function addSuggestion(suggestion: RecipeEditorSuggestion) {
		const normalizedLabel = normalizeSuggestionText(suggestion.label);

		if (registeredLabels.has(normalizedLabel)) {
			return;
		}

		registeredLabels.add(normalizedLabel);
		suggestions.push(suggestion);
	}

	for (const node of nodes) {
		if (node.type === "group") {
			addSuggestion({
				type: "group",
				label: node.name,
			});

			for (const child of node.children) {
				addSuggestion({
					type: "ingredient",
					label: child.name,
				});
			}

			continue;
		}

		addSuggestion({
			type: "ingredient",
			label: node.name,
		});
	}

	const normalizedQuery = normalizeSuggestionText(query);

	if (normalizedQuery.length === 0) {
		return suggestions;
	}

	return suggestions.filter((suggestion) =>
		normalizeSuggestionText(suggestion.label).includes(normalizedQuery),
	);
}
