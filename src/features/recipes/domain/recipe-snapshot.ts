// レシピの継承：親の中身を、部分ごとのエディタの文章で持つ（写したとき・取り込んだときの親）。
// エディタの文章は、中身から1通りに作れる形（format-recipe-editor-text.ts）なので、そのまま比べられる。
import * as v from "valibot";
import {
	formatIngredientText,
	formatInstructionText,
	formatPreparationText,
} from "./format-recipe-editor-text";
import type { RecipeEditorDocument } from "./recipe-editor-document";

export const recipeSnapshotSections = [
	"yieldText",
	"ingredients",
	"preparations",
	"instructions",
	"note",
] as const;

export type RecipeSnapshotSection = (typeof recipeSnapshotSections)[number];

export type RecipeSnapshot = Record<RecipeSnapshotSection, string>;

export const recipeSnapshotSectionLabels: Record<
	RecipeSnapshotSection,
	string
> = {
	yieldText: "できあがり",
	ingredients: "材料",
	preparations: "下準備",
	instructions: "作り方",
	note: "メモ",
};

// DB の jsonb を読むとき（形が違えば、継承の情報なしとして扱う）。
export const recipeSnapshotSchema = v.object({
	yieldText: v.string(),
	ingredients: v.string(),
	preparations: v.string(),
	instructions: v.string(),
	note: v.string(),
});

export function parseRecipeSnapshot(value: unknown): RecipeSnapshot | null {
	const parsed = v.safeParse(recipeSnapshotSchema, value);

	return parsed.success ? parsed.output : null;
}

export function createRecipeSnapshot(
	document: Pick<
		RecipeEditorDocument,
		"yieldText" | "ingredients" | "preparations" | "instructions" | "note"
	>,
): RecipeSnapshot {
	return {
		yieldText: document.yieldText,
		ingredients: formatIngredientText(document.ingredients),
		preparations: formatPreparationText(document.preparations),
		instructions: formatInstructionText(document.instructions),
		note: document.note,
	};
}

// 写しと今の親で、違う部分（並びは、画面の順）。
export function findChangedSnapshotSections(
	snapshot: RecipeSnapshot,
	current: RecipeSnapshot,
): RecipeSnapshotSection[] {
	return recipeSnapshotSections.filter(
		(section) => snapshot[section] !== current[section],
	);
}

export function isSameSnapshot(a: RecipeSnapshot, b: RecipeSnapshot): boolean {
	return findChangedSnapshotSections(a, b).length === 0;
}

// 取り込みを比べたあとに、親がまた変わっていたときの文（サーバーが断り、画面は、最新の内容で比べ直す）。
export const PARENT_CHANGED_AGAIN_MESSAGE =
	"もとのレシピが、また変わりました。違いを見直してから、もう一度お試しください";

export function isParentChangedAgainError(error: unknown): boolean {
	return (
		error instanceof Error && error.message === PARENT_CHANGED_AGAIN_MESSAGE
	);
}
