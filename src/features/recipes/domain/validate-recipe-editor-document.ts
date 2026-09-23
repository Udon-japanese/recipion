import * as v from "valibot";
import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";

const requiredText = v.pipe(v.string(), v.trim(), v.minLength(1));
const idSchema = requiredText;

const ingredientSchema: v.GenericSchema = v.lazy(() =>
	v.union([
		v.object({
			type: v.literal("ingredient"),
			status: v.literal("parsed"),
			id: idSchema,
			rawText: requiredText,
			name: requiredText,
			amountText: requiredText,
			quantity: v.nullable(v.pipe(v.number(), v.finite(), v.gtValue(0))),
			unitLabel: v.nullable(requiredText),
		}),
		v.object({
			type: v.literal("ingredient"),
			status: v.literal("missing-amount"),
			id: idSchema,
			rawText: requiredText,
			name: requiredText,
			amountText: v.null(),
			quantity: v.null(),
			unitLabel: v.null(),
		}),
		v.object({
			type: v.literal("group"),
			id: idSchema,
			name: requiredText,
			rawText: requiredText,
			inferred: v.boolean(),
			children: v.array(ingredientSchema),
		}),
	]),
);
const documentSchema = v.object({
	name: requiredText,
	servings: v.pipe(v.number(), v.finite(), v.gtValue(0)),
	ingredients: v.array(ingredientSchema),
	preparations: v.array(v.object({ id: idSchema, text: requiredText })),
	instructions: v.array(
		v.object({
			id: idSchema,
			text: requiredText,
			referencedInstructionIds: v.array(idSchema),
		}),
	),
	note: v.string(),
});

function validateIngredientIds(
	nodes: readonly RecipeEditorIngredientNode[],
	ids: Set<string>,
): void {
	for (const node of nodes) {
		if (ids.has(node.id)) {
			throw new Error("レシピ内でIDが重複しています");
		}
		ids.add(node.id);

		if (node.type === "group") {
			if (node.children.length === 0) {
				throw new Error("空の材料グループは保存できません");
			}
			validateIngredientIds(node.children, ids);
		}
	}
}

export function validateRecipeEditorDocument(
	input: unknown,
): RecipeEditorDocument {
	if (!v.safeParse(documentSchema, input).success) {
		throw new Error("レシピの入力内容を確認してください");
	}

	// 上の構造チェック後だけ、ドメイン型として扱う。
	const document = input as RecipeEditorDocument;
	const ids = new Set<string>();

	validateIngredientIds(document.ingredients, ids);

	for (const preparation of document.preparations) {
		if (ids.has(preparation.id)) {
			throw new Error("レシピ内でIDが重複しています");
		}
		ids.add(preparation.id);
	}

	const precedingInstructionIds = new Set<string>();

	for (const instruction of document.instructions) {
		if (ids.has(instruction.id)) {
			throw new Error("レシピ内でIDが重複しています");
		}
		ids.add(instruction.id);

		const references = new Set<string>();

		for (const referenceId of instruction.referencedInstructionIds) {
			if (!precedingInstructionIds.has(referenceId)) {
				throw new Error("前の工程だけを参照してください");
			}
			if (references.has(referenceId)) {
				throw new Error("同じ工程への参照が重複しています");
			}
			references.add(referenceId);
		}

		precedingInstructionIds.add(instruction.id);
	}

	return document;
}
