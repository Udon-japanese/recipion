import { foldIngredientSearchText } from "#/features/ingredients/domain/ingredient-catalog";
import type { DishPart } from "./dish-part";
import { dishPartCategories, partsInCategory } from "./dish-part-category";
import { dishPartReadings } from "./dish-part-readings";

// 棚に並ぶ部品（分類の順、分類の中の順）。在庫専用の部品は、どの分類にも入っていないので、出ない。
const shelfParts: readonly DishPart[] =
	dishPartCategories.flatMap(partsInCategory);

// 比べる文字：名前と、読み（あれば）。全角・半角、大文字・小文字、カタカナ・ひらがなの違いをなくす。
const searchIndex = shelfParts.map((part) => ({
	part,
	texts: [part.label, dishPartReadings[part.id] ?? ""]
		.filter((text) => text !== "")
		.map(foldIngredientSearchText),
}));

// 棚の部品を、名前か読みの部分一致で探す。空白で区切った語は、すべてを含むものだけ。空なら、何も返さない。
export function searchDishParts(query: string): DishPart[] {
	const terms = query
		.split(/\s+/u)
		.map(foldIngredientSearchText)
		.filter((term) => term !== "");

	if (terms.length === 0) {
		return [];
	}

	return searchIndex
		.filter(({ texts }) =>
			terms.every((term) => texts.some((text) => text.includes(term))),
		)
		.map(({ part }) => part);
}
