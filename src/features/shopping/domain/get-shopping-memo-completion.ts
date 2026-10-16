import { searchIngredientCatalog } from "#/features/ingredients/domain/ingredient-catalog";
import type { ShoppingMemoStore } from "./parse-shopping-memo";

// 「まとめて追加」の入力欄の補完（純粋な関数）。カーソルがある行の、書きかけの部分の候補を返す。
// - 「@」のあと：登録済みの店の名前。
// - ふつうの行（数字を書く前）：食材名（カタログ）と、店の名前（見出し用）。
// 行の途中（カーソルのあとに文字がある）や、数量を書き始めたあとは、出さない。

export type ShoppingMemoCompletionItem = {
	label: string;
	kind: "ingredient" | "store";
};

export type ShoppingMemoCompletion = {
	items: ShoppingMemoCompletionItem[];
	// 候補で置き換える範囲（本文の index）。
	from: number;
	to: number;
};

const maxItems = 6;

function fold(text: string): string {
	return text.normalize("NFKC").trim().toLowerCase();
}

export function getShoppingMemoCompletion(
	text: string,
	caret: number,
	stores: readonly ShoppingMemoStore[],
): ShoppingMemoCompletion | null {
	const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
	const nextBreak = text.indexOf("\n", caret);
	const lineEnd = nextBreak === -1 ? text.length : nextBreak;

	// 行の途中では、出さない。
	if (caret !== lineEnd) {
		return null;
	}

	const line = text.slice(lineStart, caret);
	const indent = line.length - line.trimStart().length;
	const typedLine = line.slice(indent);
	const normalizedLine = typedLine.normalize("NFKC");

	// 「@」のあと：店の名前。
	const atIndex = Math.max(
		typedLine.lastIndexOf("@"),
		typedLine.lastIndexOf("＠"),
	);

	if (atIndex !== -1) {
		const fragment = typedLine.slice(atIndex + 1);
		const folded = fold(fragment);
		const items = stores
			.filter(
				(store) =>
					fold(store.name) !== folded && fold(store.name).startsWith(folded),
			)
			.slice(0, maxItems)
			.map(
				(store): ShoppingMemoCompletionItem => ({
					label: store.name,
					kind: "store",
				}),
			);

		return items.length === 0
			? null
			: { items, from: lineStart + indent + atIndex + 1, to: caret };
	}

	// 数量を書き始めたあと（数字・×）は、出さない。
	if (normalizedLine === "" || /[\d×xX]/u.test(normalizedLine)) {
		return null;
	}

	const folded = fold(typedLine);
	const ingredients = searchIngredientCatalog(typedLine, maxItems + 1)
		.map((entry) => entry.name)
		.filter((name) => fold(name) !== folded)
		.slice(0, maxItems)
		.map(
			(name): ShoppingMemoCompletionItem => ({
				label: name,
				kind: "ingredient",
			}),
		);
	// 店の名前（見出し）。前方一致だけ。
	const storeHeadings = stores
		.filter(
			(store) =>
				fold(store.name) !== folded && fold(store.name).startsWith(folded),
		)
		.map(
			(store): ShoppingMemoCompletionItem => ({
				label: store.name,
				kind: "store",
			}),
		);
	// 食材が多くても、店の名前（見出し）の候補を、2つまでは残す。
	const storeSlots = Math.min(storeHeadings.length, 2);
	const items = [
		...ingredients.slice(0, maxItems - storeSlots),
		...storeHeadings.slice(0, storeSlots),
	];

	return items.length === 0
		? null
		: { items, from: lineStart + indent, to: caret };
}

// 候補で、書きかけの部分を置き換えた本文と、カーソルの位置。
export function applyShoppingMemoCompletion(
	text: string,
	completion: ShoppingMemoCompletion,
	index: number,
): { text: string; caret: number } {
	const item = completion.items[index];

	if (!item) {
		return { text, caret: completion.to };
	}

	return {
		text:
			text.slice(0, completion.from) + item.label + text.slice(completion.to),
		caret: completion.from + item.label.length,
	};
}
