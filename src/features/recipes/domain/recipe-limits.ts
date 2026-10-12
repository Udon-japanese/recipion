// レシピの入力の上限（1か所にまとめる）。値を変えるときは、ここだけを直す。
// 目的：保存の容量、AI の審査の枠、サーバーの処理時間（Workers 無料枠の CPU）を、守ること。
// 画面（保存の前）と、サーバー（validateRecipeEditorDocument）で、同じ関数を使う。
import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";

export const recipeLimits = {
	nameMaxLength: 100,
	maxIngredients: 100,
	maxIngredientGroups: 30,
	ingredientNameMaxLength: 100,
	ingredientAmountMaxLength: 100,
	// 貼り付けた元の行（編集のために残す）。
	ingredientRawTextMaxLength: 300,
	maxPreparations: 50,
	preparationMaxLength: 1000,
	maxInstructions: 50,
	instructionMaxLength: 1000,
	noteMaxLength: 3000,
	// タイトル・材料名・分量・下準備・作り方・メモの、文字数の合計。
	totalMaxLength: 12000,
	// 1人が持てるレシピの数。
	maxRecipesPerUser: 300,
} as const;

function length(text: string): number {
	return [...text].length;
}

function format(count: number): string {
	return count.toLocaleString("ja-JP");
}

type IngredientStats = {
	ingredients: number;
	groups: number;
	characters: number;
	tooLongName: boolean;
	tooLongAmount: boolean;
	tooLongRawText: boolean;
};

function collectIngredientStats(
	nodes: readonly RecipeEditorIngredientNode[],
	stats: IngredientStats,
): void {
	for (const node of nodes) {
		stats.characters += length(node.name);
		stats.tooLongName ||=
			length(node.name) > recipeLimits.ingredientNameMaxLength;
		stats.tooLongRawText ||=
			length(node.rawText) > recipeLimits.ingredientRawTextMaxLength;

		if (node.type === "group") {
			stats.groups += 1;
			collectIngredientStats(node.children, stats);

			continue;
		}

		stats.ingredients += 1;

		if (node.amountText !== null) {
			stats.characters += length(node.amountText);
			stats.tooLongAmount ||=
				length(node.amountText) > recipeLimits.ingredientAmountMaxLength;
		}
	}
}

// 上限を超えている最初の項目の、画面に出す文（なければ null）。
export function findRecipeLimitViolation(
	document: RecipeEditorDocument,
): string | null {
	const limits = recipeLimits;

	if (length(document.name) > limits.nameMaxLength) {
		return `レシピ名は、${format(limits.nameMaxLength)}文字までです。`;
	}

	const stats: IngredientStats = {
		ingredients: 0,
		groups: 0,
		characters: 0,
		tooLongName: false,
		tooLongAmount: false,
		tooLongRawText: false,
	};

	collectIngredientStats(document.ingredients, stats);

	if (stats.ingredients > limits.maxIngredients) {
		return `材料は、${format(limits.maxIngredients)}件までです。`;
	}

	if (stats.groups > limits.maxIngredientGroups) {
		return `材料のグループは、${format(limits.maxIngredientGroups)}個までです。`;
	}

	if (stats.tooLongName) {
		return `材料の名前は、${format(limits.ingredientNameMaxLength)}文字までです。`;
	}

	if (stats.tooLongAmount || stats.tooLongRawText) {
		return `材料の分量は、${format(limits.ingredientAmountMaxLength)}文字までです。`;
	}

	if (document.preparations.length > limits.maxPreparations) {
		return `下準備は、${format(limits.maxPreparations)}件までです。`;
	}

	if (
		document.preparations.some(
			(preparation) => length(preparation.text) > limits.preparationMaxLength,
		)
	) {
		return `下準備の1件は、${format(limits.preparationMaxLength)}文字までです。`;
	}

	if (document.instructions.length > limits.maxInstructions) {
		return `作り方は、${format(limits.maxInstructions)}件までです。`;
	}

	if (
		document.instructions.some(
			(instruction) => length(instruction.text) > limits.instructionMaxLength,
		)
	) {
		return `作り方の1つの工程は、${format(limits.instructionMaxLength)}文字までです。`;
	}

	if (length(document.note) > limits.noteMaxLength) {
		return `メモは、${format(limits.noteMaxLength)}文字までです。`;
	}

	const total =
		length(document.name) +
		stats.characters +
		document.preparations.reduce(
			(sum, preparation) => sum + length(preparation.text),
			0,
		) +
		document.instructions.reduce(
			(sum, instruction) => sum + length(instruction.text),
			0,
		) +
		length(document.note);

	if (total > limits.totalMaxLength) {
		return `レシピ全体で、${format(limits.totalMaxLength)}文字までです（いま、${format(total)}文字）。`;
	}

	return null;
}

// 1人が持てるレシピの数に、新しい1件を足せるか。足せないときは、画面に出す文。
export function findRecipeCountViolation(currentCount: number): string | null {
	return currentCount >= recipeLimits.maxRecipesPerUser
		? `レシピは、${format(recipeLimits.maxRecipesPerUser)}件までです。不要なレシピを削除してから、お試しください。`
		: null;
}
