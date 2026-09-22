import * as v from "valibot";

const ingredientNameSchema = v.pipe(
	v.string(),
	v.transform((name) => name.normalize("NFKC")),
	v.trim(),
	v.minLength(1, "食材名を入力してください"),
	v.transform((name) => name.replace(/\s+/gu, " ")),
);

export function formatIngredientName(name: string): string {
	return v.parse(ingredientNameSchema, name);
}

export function normalizeIngredientName(name: string): string {
	return formatIngredientName(name).toLocaleLowerCase("ja-JP");
}
