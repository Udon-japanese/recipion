import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";

// 同じ単位の仲間（重さ・体積）にそろえるための係数。大さじ1＝15ml、小さじ1＝5ml、カップ1＝200ml。
const massUnitGrams: Record<string, number> = { g: 1, kg: 1000 };
const volumeUnitMilliliters: Record<string, number> = {
	ml: 1,
	cc: 1,
	l: 1000,
	大さじ: 15,
	小さじ: 5,
	カップ: 200,
};

type Dimension = "mass" | "volume" | `unit:${string}`;

function dimensionOf(need: RecipeShoppingNeed): Dimension {
	const unit = need.unitLabel?.toLocaleLowerCase("ja-JP") ?? "";

	if (unit in massUnitGrams) {
		return "mass";
	}

	if (unit in volumeUnitMilliliters) {
		return "volume";
	}

	return `unit:${unit}`;
}

function round(value: number): number {
	return Number(value.toFixed(6));
}

function groupKey(need: RecipeShoppingNeed): string {
	const catalogId = findIngredientCatalogEntry(need.name)?.id;

	return `${need.sectionTitle ?? ""}|${catalogId ?? normalizeIngredientName(need.name)}`;
}

// 同じ仲間の、数量のある行を、1つにまとめる。同じ単位ならその単位で、違う単位（大さじと小さじなど）なら g / ml で表す。
function sumLines(lines: readonly RecipeShoppingNeed[]): {
	quantity: number;
	unitLabel: string | null;
} {
	const [first] = lines;

	if (!first) {
		return { quantity: 0, unitLabel: null };
	}

	const dimension = dimensionOf(first);
	const isSameLabel = lines.every((line) => line.unitLabel === first.unitLabel);

	if (dimension === "mass") {
		const grams = lines.reduce(
			(sum, line) =>
				sum +
				(line.quantity ?? 0) *
					(massUnitGrams[line.unitLabel?.toLocaleLowerCase("ja-JP") ?? ""] ??
						1),
			0,
		);

		return isSameLabel && first.unitLabel === "kg"
			? { quantity: round(grams / 1000), unitLabel: "kg" }
			: { quantity: round(grams), unitLabel: "g" };
	}

	if (dimension === "volume") {
		if (isSameLabel) {
			return {
				quantity: round(
					lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0),
				),
				unitLabel: first.unitLabel,
			};
		}

		const milliliters = lines.reduce(
			(sum, line) =>
				sum +
				(line.quantity ?? 0) *
					(volumeUnitMilliliters[
						line.unitLabel?.toLocaleLowerCase("ja-JP") ?? ""
					] ?? 1),
			0,
		);

		return { quantity: round(milliliters), unitLabel: "ml" };
	}

	return {
		quantity: round(lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0)),
		unitLabel: first.unitLabel,
	};
}

// 計量の単位は、数量の前に置く（「大さじ1と1/2」）。それ以外は、あとに置く（「200g」「2個」）。
const leadingUnits = new Set(["大さじ", "小さじ", "カップ"]);

function describeAmount(quantity: number, unitLabel: string | null): string {
	const text = formatQuantity(quantity, {
		grouping: false,
		allowFractions: unitLabel === null || !(unitLabel in massUnitGrams),
	}).replace(" ", "と");

	return unitLabel !== null && leadingUnits.has(unitLabel)
		? `${unitLabel}${text}`
		: `${text}${unitLabel ?? ""}`;
}

/**
 * 同じ食材の行（別名を含む。同じまとまり＝リンク先のレシピごと、の中だけ）を、1行にまとめる。
 * - 数量を同じ単位に換算できる行は、合算する（大さじ2＋大さじ1＝大さじ3。大さじ1＋小さじ1＝20ml）。
 * - 「少し」「適量」など数量のない行は、まとめた行の補足にする（数量のある行がなければ、数量のない1行にする）。
 * - 換算できない行（「1本」と「大さじ2」など）は、まとめず、別の行のままにする。
 * - 他のレシピへのリンクの行は、そのまま。
 * まとめた行は、`mergedAmountTexts` に元の分量の原文を残す（内訳の表示用）。
 */
export function mergeRecipeNeeds(
	needs: readonly RecipeShoppingNeed[],
): RecipeShoppingNeed[] {
	const groups = new Map<string, RecipeShoppingNeed[]>();
	const order: (string | RecipeShoppingNeed)[] = [];

	for (const need of needs) {
		if (need.linkedRecipe) {
			order.push(need);
			continue;
		}

		const key = groupKey(need);
		const group = groups.get(key);

		if (group) {
			group.push(need);
		} else {
			groups.set(key, [need]);
			order.push(key);
		}
	}

	return order.flatMap((entry): RecipeShoppingNeed[] => {
		if (typeof entry !== "string") {
			return [entry];
		}

		const lines = groups.get(entry) ?? [];

		if (lines.length === 1) {
			return lines;
		}

		const quantified = lines.filter((line) => line.quantity !== null);
		const unquantified = lines.filter((line) => line.quantity === null);
		const unquantifiedTexts = unquantified.map(
			(line) => line.amountText ?? "量の指定なし",
		);

		// 数量のある行を、換算できる仲間ごとに分ける（出てきた順）。
		const buckets = new Map<Dimension, RecipeShoppingNeed[]>();

		for (const line of quantified) {
			const dimension = dimensionOf(line);

			buckets.set(dimension, [...(buckets.get(dimension) ?? []), line]);
		}

		if (buckets.size === 0) {
			const [first] = lines;

			return first
				? [
						{
							...first,
							amountText: unquantifiedTexts[0] ?? first.amountText,
							mergedAmountTexts: unquantifiedTexts,
						},
					]
				: [];
		}

		return [...buckets.values()].map((bucketLines, index) => {
			const [first] = bucketLines;
			const { quantity, unitLabel } = sumLines(bucketLines);
			const supplements = index === 0 ? unquantifiedTexts : [];
			const base = describeAmount(quantity, unitLabel);

			return {
				...(first as RecipeShoppingNeed),
				quantity,
				unitLabel,
				amountText:
					supplements.length > 0
						? `${base}（＋${supplements.join("、")}）`
						: base,
				mergedAmountTexts: [
					...bucketLines.map((line) => line.amountText ?? ""),
					...supplements,
				].filter((text) => text !== ""),
			};
		});
	});
}
