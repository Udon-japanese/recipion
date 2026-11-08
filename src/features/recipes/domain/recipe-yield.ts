// レシピのできあがりの量（「4人分」「12個」「18cmのパウンド型1台」「作りやすい分量」）。
// 文章の最後の数（型の大きさなどの寸法は除く）を、増減の基準として読む（その前後の文字は、そのまま残す）。
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";

export type RecipeYield = {
	// 最後の数の前の文字（「18cmのパウンド型」）。
	prefix: string;
	quantity: number;
	// 最後の数の後ろの文字（「人分」「個」「台」）。
	suffix: string;
};

export const maxRecipeYieldLength = 30;
export const defaultRecipeYieldText = "2人分";

// 数（整数・小数・分数）。
const numberPattern = /\d+(?:\.\d+)?(?:\/\d+)?/gu;
// 寸法の数：後ろに長さ・型の大きさの単位が続く（「18cm」「5号」）か、「×」で次の数につながる（「25×6」の 25）。
const dimensionAfterPattern = /^\s*(?:cm|mm|センチ|インチ|号|寸|[×xX*]\s*\d)/u;
// 寸法の数：「×」で前の数につながる（「25×6」の 6）。「15cm×2台」の 2 は、前が数ではないので寸法にしない。
const dimensionBeforePattern = /\d\s*[×xX*]\s*$/u;
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
	const match = [...normalized.matchAll(numberPattern)]
		.filter(
			(candidate) =>
				!dimensionAfterPattern.test(
					normalized.slice(candidate.index + candidate[0].length),
				) && !dimensionBeforePattern.test(normalized.slice(0, candidate.index)),
		)
		.at(-1);

	if (!match) {
		return null;
	}

	const prefix = normalized.slice(0, match.index);
	const quantity = parseNumber(match[0]);

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
		suffix: normalized.slice(match.index + match[0].length),
	};
}

// 数を置き換えた、できあがりの量（「4人分」→「2人分」、「型1台」→「型1と1/2台」）。
export function formatRecipeYield(
	recipeYield: RecipeYield,
	quantity: number,
): string {
	return `${recipeYield.prefix}${formatRecipeYieldQuantity(quantity)}${recipeYield.suffix}`;
}

// できあがりの量の、数の部分だけ（「1.5」→「1と1/2」）。
export function formatRecipeYieldQuantity(quantity: number): string {
	return formatQuantity(quantity, { grouping: false }).replace(" ", "と");
}

// 見る人が選べる、できあがりの数の上限（詳細の URL の ?n= の上限と同じ）。
export const maxWantedYield = 1000;

// 見る人が打った、できあがりの数（「16」「１６」「1.5」「1/2」）。0 以下・上限を超える・読めないときは null。
export function parseWantedYieldInput(text: string): number | null {
	const quantity = parseQuantityInput(text);

	return quantity !== null && quantity > 0 && quantity <= maxWantedYield
		? quantity
		: null;
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

// 買い物メモへ入れる量の知らせ（割合が1なら、なし）。例：「4人分の量で入れます（レシピは2人分）」。
export function describeShoppingAmount(
	yieldText: string,
	ratio: number,
	reason?: string,
): string | null {
	if (ratio === 1) {
		return null;
	}

	return `${reason ?? ""}${scaleRecipeYieldText(yieldText, ratio)}の量で入れます（レシピは${yieldText}）`;
}
