import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "../domain/recipe-editor-document";
import { validateRecipeEditorDocument } from "../domain/validate-recipe-editor-document";

export type StoredRecipeIngredientNode = {
	id: string;
	parentId: string | null;
	sortOrder: number;
	type: "ingredient" | "group";
	name: string;
	rawText: string;
	inferred: boolean | null;
	status: "parsed" | "missing-amount" | null;
	amountText: string | null;
	quantity: number | null;
	unitLabel: string | null;
};

export type PreparedRecipeForStorage = {
	name: string;
	servings: number;
	note: string;
	ingredients: StoredRecipeIngredientNode[];
	preparations: {
		id: string;
		sortOrder: number;
		text: string;
	}[];
	instructions: {
		id: string;
		sortOrder: number;
		text: string;
		referencedInstructionIds: string[];
	}[];
};

function flattenIngredients(
	nodes: readonly RecipeEditorIngredientNode[],
	parentId: string | null,
	result: StoredRecipeIngredientNode[],
): void {
	for (const [sortOrder, node] of nodes.entries()) {
		if (node.type === "group") {
			result.push({
				id: node.id,
				parentId,
				sortOrder,
				type: "group",
				name: node.name,
				rawText: node.rawText,
				inferred: node.inferred,
				status: null,
				amountText: null,
				quantity: null,
				unitLabel: null,
			});

			flattenIngredients(node.children, node.id, result);
			continue;
		}

		result.push({
			id: node.id,
			parentId,
			sortOrder,
			type: "ingredient",
			name: node.name,
			rawText: node.rawText,
			inferred: null,
			status: node.status,
			amountText: node.amountText,
			quantity: node.quantity,
			unitLabel: node.unitLabel,
		});
	}
}

export function prepareRecipeForStorage(
	input: RecipeEditorDocument,
): PreparedRecipeForStorage {
	const document = validateRecipeEditorDocument(input);
	const ingredients: StoredRecipeIngredientNode[] = [];

	flattenIngredients(document.ingredients, null, ingredients);

	return {
		name: document.name.trim(),
		servings: document.servings,
		note: document.note,
		ingredients,
		preparations: document.preparations.map((preparation, sortOrder) => ({
			id: preparation.id,
			sortOrder,
			text: preparation.text,
		})),
		instructions: document.instructions.map((instruction, sortOrder) => ({
			id: instruction.id,
			sortOrder,
			text: instruction.text,
			referencedInstructionIds: [...instruction.referencedInstructionIds],
		})),
	};
}
