// レシピのできあがりの量（「4人分」「12個」「18cmのパウンド型1台」「作りやすい分量」）。
// 文章の最後の数を、増減の基準として読む（その前後の文字は、そのまま残す）。
import { formatQuantity } from "#/features/quantity/domain/format-quantity";

export type RecipeYield = {
	// 最後の数の前の文字（「18cmのパウンド型」）。
	prefix: string;
	quantity: number;
	// 最後の数の後ろの文字（「人分」「個」「台」）。
	suffix: string;
};

export const maxRecipeYieldLength = 30;
export const defaultRecipeYieldText = "2人分";

// 最後の数（整数・小数・分数）。後ろに、もう数がない位置。
const lastNumberPattern = /(\d+(?:\.\d+)?(?:\/\d+)?)(?=\D*$)/u;
// 「2〜3人分」の「〜3」のような、範囲の後ろの数（増減しない）。
const rangeBeforePattern = /\d\s*(?:[~〜～\-−ー－]|から)\s*$/u;

function parseNumber(text: string): number {
	const [numerator, denominator] = text.split("/");

	return denominator === undefined
		? Number(numerator)
		: Number(numerator) / Number(denominator);
}

// できあがりの量を読む。数がない・範囲・0 のときは null（増減しない）。
export function parseRecipeYield(text: string): RecipeYield | null {
	const normalized = text.normalize("NFKC").trim();
	const match = normalized.match(lastNumberPattern);

	if (!match || match.index === undefined) {
		return null;
	}

	const prefix = normalized.slice(0, match.index);
	const quantity = parseNumber(match[1]);

	if (
		rangeBeforePattern.test(prefix) ||
		!Number.isFinite(quantity) ||
		quantity <= 0
	) {
		return null;
	}

	return {
		prefix,
		quantity,
		suffix: normalized.slice(match.index + match[1].length),
	};
}

// 数を置き換えた、できあがりの量（「4人分」→「2人分」、「型1台」→「型1と1/2台」）。
export function formatRecipeYield(
	recipeYield: RecipeYield,
	quantity: number,
): string {
	return `${recipeYield.prefix}${formatQuantity(quantity, { grouping: false }).replace(" ", "と")}${recipeYield.suffix}`;
}

// 単位の比べ方：前後の空白と、最後の「分」を除く（「4人分」と「2人分」、「12個分」と「6個」を同じ単位にする）。
export function normalizeYieldUnit(unit: string): string {
	return unit.normalize("NFKC").trim().replace(/分$/u, "");
}

// できあがりの量の数を、1ずつ増減する（エディタの −／＋）。1より小さくはしない。読めないときは null。
export function stepRecipeYield(text: string, delta: number): string | null {
	const recipeYield = parseRecipeYield(text);

	if (!recipeYield) {
		return null;
	}

	const next = Number((recipeYield.quantity + delta).toFixed(3));

	return next < 1 && delta < 0 ? null : formatRecipeYield(recipeYield, next);
}

// 割合を掛けた、できあがりの量の表記（割合が1なら、そのまま）。数のない量（作りやすい分量）は「〜の2倍」。
export function scaleRecipeYieldText(text: string, ratio: number): string {
	if (ratio === 1) {
		return text;
	}

	const recipeYield = parseRecipeYield(text);

	return recipeYield
		? formatRecipeYield(
				recipeYield,
				Number((recipeYield.quantity * ratio).toFixed(2)),
			)
		: `${text}の${formatQuantity(Number(ratio.toFixed(2)), { grouping: false }).replace(" ", "と")}倍`;
}

// 見る人が選んだ数（?n=）から、割合を出す。増減できない・数がないときは 1。
export function ratioForYield(
	text: string,
	wanted: number | undefined,
): number {
	const recipeYield = parseRecipeYield(text);

	if (!recipeYield || wanted === undefined || !(wanted > 0)) {
		return 1;
	}

	return wanted / recipeYield.quantity;
}
