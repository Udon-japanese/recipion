function formatPositiveStorageNumber(
	value: number,
	scale: number,
	upperBound: number,
	label: string,
): string {
	if (!Number.isFinite(value) || value <= 0 || value >= upperBound) {
		throw new Error(`${label}を保存できる範囲で指定してください`);
	}

	const formatted = value.toFixed(scale);

	if (Number(formatted) <= 0) {
		throw new Error(`${label}が小さすぎます`);
	}

	return formatted;
}

export function formatRecipeServings(value: number): string {
	// recipe.servings: numeric(10, 3)
	return formatPositiveStorageNumber(value, 3, 10_000_000, "基準人数");
}

export function formatRecipeIngredientQuantity(value: number): string {
	// recipe_ingredient_node.quantity: numeric(18, 6)
	// 浮動小数点数からの変換精度も考慮し、列の上限より小さく制限する。
	return formatPositiveStorageNumber(value, 6, 1_000_000_000, "材料の数量");
}
