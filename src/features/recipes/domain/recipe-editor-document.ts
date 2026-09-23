import type {
	ParsedRecipeIngredientGroup,
	ParsedRecipeIngredientItem,
	ParsedRecipeIngredientNode,
} from "./parse-recipe-ingredients";
import { parseRecipeIngredients } from "./parse-recipe-ingredients";
import { parseRecipeInstructions } from "./parse-recipe-instructions";
import { parseRecipePreparations } from "./parse-recipe-preparations";

export type RecipeEditorIngredientItem = ParsedRecipeIngredientItem & {
	id: string;
};

export type RecipeEditorIngredientGroup = Omit<
	ParsedRecipeIngredientGroup,
	"children"
> & {
	id: string;
	children: RecipeEditorIngredientNode[];
};

export type RecipeEditorIngredientNode =
	| RecipeEditorIngredientItem
	| RecipeEditorIngredientGroup;

export type RecipeEditorPreparation = {
	id: string;
	text: string;
};

export type RecipeEditorInstruction = {
	id: string;
	text: string;
	referencedInstructionIds: string[];
};

export type RecipeEditorDocument = {
	name: string;
	servings: number;
	ingredients: RecipeEditorIngredientNode[];
	preparations: RecipeEditorPreparation[];
	instructions: RecipeEditorInstruction[];
	note: string;
};

export type CreateRecipeEditorDocumentInput = {
	name?: string;
	servings?: number;
	ingredientText?: string;
	preparationText?: string;
	instructionText?: string;
	note?: string;
};

type CreateId = () => string;

function createIngredientNode(
	node: ParsedRecipeIngredientNode,
	createId: CreateId,
): RecipeEditorIngredientNode {
	if (node.type === "ingredient") {
		return {
			...node,
			id: createId(),
		};
	}

	return {
		...node,
		id: createId(),
		children: node.children.map((child) =>
			createIngredientNode(child, createId),
		),
	};
}

export function createRecipeEditorDocument(
	input: CreateRecipeEditorDocumentInput = {},
	createId: CreateId = () => crypto.randomUUID(),
): RecipeEditorDocument {
	const parsedIngredients = parseRecipeIngredients(input.ingredientText ?? "");

	return {
		name: input.name?.trim() ?? "",
		servings: input.servings ?? 2,
		ingredients: parsedIngredients.map((node) =>
			createIngredientNode(node, createId),
		),
		preparations: parseRecipePreparations(input.preparationText ?? "").map(
			(text) => ({
				id: createId(),
				text,
			}),
		),
		instructions: parseRecipeInstructions(input.instructionText ?? "").map(
			(text) => ({
				id: createId(),
				text,
				referencedInstructionIds: [],
			}),
		),
		note: input.note?.trim() ?? "",
	};
}
