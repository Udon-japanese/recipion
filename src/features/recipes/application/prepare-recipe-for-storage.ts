import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "../domain/recipe-editor-document";
import type { RecipeVisibility } from "../domain/recipe-link-permission";
import {
	extractLinkLabels,
	type RecipeLinkReference,
} from "../domain/recipe-links";
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
	sourceUrl: string | null;
	visibility: RecipeVisibility;
	stocksWhenMade: boolean;
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
	// 本文に出てくるラベルのリンクだけ。
	links: RecipeLinkReference[];
};

// 本文（下準備・作り方・メモ・材料名）に出てくるラベルのリンクだけを残す（本文から消したリンクは、捨てる）。
function keepUsedLinks(document: RecipeEditorDocument): RecipeLinkReference[] {
	const names: string[] = [];

	const collect = (nodes: readonly RecipeEditorIngredientNode[]) => {
		for (const node of nodes) {
			names.push(node.name);

			if (node.type === "group") {
				collect(node.children);
			}
		}
	};

	collect(document.ingredients);

	const usedLabels = new Set(
		extractLinkLabels([
			...document.preparations.map((preparation) => preparation.text),
			...document.instructions.map((instruction) => instruction.text),
			document.note,
			...names,
		]),
	);

	return document.links.filter((link) => usedLabels.has(link.label));
}

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
		sourceUrl: document.sourceUrl,
		visibility: document.visibility ?? "private",
		stocksWhenMade: document.stocksWhenMade ?? false,
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
		links: keepUsedLinks(document).map((link) => ({ ...link })),
	};
}
