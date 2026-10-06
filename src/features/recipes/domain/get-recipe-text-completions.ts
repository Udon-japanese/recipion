import {
	foldIngredientSearchText,
	listIngredientSearchTerms,
	searchIngredientCatalog,
} from "#/features/ingredients/domain/ingredient-catalog";
import {
	formatHeading,
	recipeHeadingLabels,
} from "./format-recipe-editor-text";
import {
	classifyRecipeBlock,
	parseRecipeHeading,
	type RecipeSectionKind,
} from "./split-recipe-sections";

export type RecipeTextCompletionItem = {
	// 候補として見せる文字列。
	label: string;
	// 本文に入れる文字列。
	insert: string;
	// 入れ替える範囲の始まり（終わりは、補完の `to`）。
	from: number;
	// 見出しの候補は、入れたあとに、次の行へ移る。
	isHeading?: boolean;
};

export type RecipeTextCompletion = {
	to: number;
	items: RecipeTextCompletionItem[];
};

const maxItems = 6;

// 記号を、読み仮名（ひらがな）で出す。グループの印（☆★◎ など）を、記号の変換なしで入れられる。
const symbolReadings: { symbol: string; readings: string[] }[] = [
	{ symbol: "☆", readings: ["ほし", "しろほし", "すたー"] },
	{ symbol: "★", readings: ["ほし", "くろほし", "すたー"] },
	{ symbol: "○", readings: ["まる", "しろまる"] },
	{ symbol: "●", readings: ["まる", "くろまる"] },
	{ symbol: "◎", readings: ["にじゅうまる", "まる"] },
	{ symbol: "◆", readings: ["ひしがた", "くろひしがた", "だいや"] },
	{ symbol: "◇", readings: ["ひしがた", "しろひしがた", "だいや"] },
	{ symbol: "■", readings: ["しかく", "くろしかく"] },
	{ symbol: "□", readings: ["しかく", "しろしかく"] },
	{ symbol: "▲", readings: ["さんかく", "くろさんかく"] },
	{ symbol: "△", readings: ["さんかく", "しろさんかく"] },
	{ symbol: "※", readings: ["こめ", "こめじるし", "ちゅうい"] },
	{ symbol: "→", readings: ["やじるし", "みぎ"] },
	{ symbol: "♪", readings: ["おんぷ"] },
	{ symbol: "♡", readings: ["はーと"] },
];
const maxSymbolReadingLength = 6;
const minSymbolReadingLength = 2;

// カタカナをひらがなにそろえる（「スター」→「すたー」）。
function foldToHiragana(text: string): string {
	return text
		.normalize("NFKC")
		.replace(/[ァ-ヶ]/gu, (char) =>
			String.fromCharCode(char.charCodeAt(0) - 0x60),
		);
}

// 見出しの飾りの、開く側。これを打つと、見出しの候補を出す。
const headingOpenerPattern =
	/^(\s*)[＜<【[［■□◆◇▼▽●○◎＃#《〈]\s*([^＞>】\]］》〉]*)$/u;
const headingCloserPattern = /^[＞>】\]］》〉]/u;

const headingKinds: RecipeSectionKind[] = [
	"ingredients",
	"preparations",
	"instructions",
	"note",
];

const bulletPattern = /^[・●◦•\-*]\s*/u;
const groupSymbolPattern = /^[☆★◎○●◆◇■□▲△]/u;
// 材料名の途中に現れない文字（ここから先は、分量や補足）。
const nameBreakPattern = /[\s　:：0-9０-９]/u;
// 作り方・下準備の文章で、材料名の始まりを探す範囲を区切る文字。
const segmentBreakPattern = /[\s　、。，．,.（）()「」『』・:：0-9０-９]/u;
const maxSegmentLength = 20;

// カーソルの行が、どの部分にあるか。見出しがあれば、直前の見出し。見出しが1つもなければ、空行で区切ったブロックの内容から判別する。
function findSection(
	text: string,
	lineStart: number,
): RecipeSectionKind | null {
	const lines = text.split("\n");

	if (!lines.some((line) => parseRecipeHeading(line))) {
		return findBlockSection(
			lines,
			text.slice(0, lineStart).split("\n").length - 1,
		);
	}

	const linesBefore = text.slice(0, lineStart).split("\n");

	for (let index = linesBefore.length - 1; index >= 0; index -= 1) {
		const heading = parseRecipeHeading(linesBefore[index]);

		if (heading) {
			return heading.kind;
		}
	}

	return null;
}

function findBlockSection(
	lines: readonly string[],
	lineIndex: number,
): RecipeSectionKind | null {
	let start = lineIndex;
	let end = lineIndex;

	while (start > 0 && lines[start - 1].trim() !== "") {
		start -= 1;
	}

	while (end < lines.length - 1 && lines[end + 1].trim() !== "") {
		end += 1;
	}

	return classifyRecipeBlock(lines.slice(start, end + 1).join("\n"));
}

function completeHeading(
	before: string,
	lineStart: number,
	caret: number,
	after: string,
): RecipeTextCompletion | null {
	const match = before.match(headingOpenerPattern);

	// 後ろに、閉じ括弧以外の文字があるとき（書いた見出しの途中）は、出さない。
	if (!match || !/^[＞>】\]］》〉]?$/u.test(after)) {
		return null;
	}

	const typed = match[2].trim();
	const items = headingKinds
		.filter((kind) => recipeHeadingLabels[kind].startsWith(typed))
		.map((kind) => ({
			label: formatHeading(kind),
			insert: formatHeading(kind),
			from: lineStart + match[1].length,
			isHeading: true,
		}));

	if (items.length === 0) {
		return null;
	}

	// 自動で閉じ括弧が入っていたら、一緒に置き換える。
	return { to: caret + (headingCloserPattern.test(after) ? 1 : 0), items };
}

function completeIngredientName(
	before: string,
	caret: number,
): RecipeTextCompletion | null {
	const token = before.trimStart().replace(bulletPattern, "");

	if (
		token === "" ||
		groupSymbolPattern.test(token) ||
		nameBreakPattern.test(token)
	) {
		return null;
	}

	const items = searchIngredientCatalog(token, maxItems + 1)
		.filter((entry) => entry.name !== token)
		.slice(0, maxItems)
		.map((entry) => ({
			label: entry.name,
			insert: entry.name,
			from: caret - token.length,
		}));

	return items.length === 0 ? null : { to: caret, items };
}

// 作り方・下準備の中で、材料名（と、カタログにある食材の別名・読み仮名）の始まりを打つと、その材料名を出す。
function completeRecipeName(
	before: string,
	caret: number,
	recipeNames: readonly string[],
): RecipeTextCompletion | null {
	let segmentStart = before.length;

	while (
		segmentStart > 0 &&
		before.length - segmentStart < maxSegmentLength &&
		!segmentBreakPattern.test(before[segmentStart - 1])
	) {
		segmentStart -= 1;
	}

	const segment = before.slice(segmentStart);
	const candidates: { name: string; typedLength: number }[] = [];

	for (const name of new Set(recipeNames)) {
		const foldedName = foldIngredientSearchText(name);
		const terms = [foldedName, ...listIngredientSearchTerms(name)];

		// 入力した文字列の末尾が、名前・別名・読み仮名の始まりと一致する、いちばん長い部分。
		for (let length = segment.length; length >= 2; length -= 1) {
			const typed = foldIngredientSearchText(
				segment.slice(segment.length - length),
			);

			// 材料名を、打ち終えたあとは、出さない。
			if (typed === foldedName) {
				break;
			}

			if (terms.some((term) => term.startsWith(typed))) {
				candidates.push({ name, typedLength: length });
				break;
			}
		}
	}

	if (candidates.length === 0) {
		return null;
	}

	return {
		to: caret,
		items: candidates
			.sort((a, b) => b.typedLength - a.typedLength)
			.slice(0, maxItems)
			.map(({ name, typedLength }) => ({
				label: name,
				insert: name,
				from: caret - typedLength,
			})),
	};
}

// 末尾の「ほし」「すたー」のような読み仮名から、記号の候補を出す（2文字以上）。
function completeSymbol(
	before: string,
	caret: number,
): RecipeTextCompletion | null {
	let segmentStart = before.length;

	while (
		segmentStart > 0 &&
		before.length - segmentStart < maxSymbolReadingLength &&
		!segmentBreakPattern.test(before[segmentStart - 1])
	) {
		segmentStart -= 1;
	}

	const segment = before.slice(segmentStart);

	for (
		let length = segment.length;
		length >= minSymbolReadingLength;
		length -= 1
	) {
		const typed = foldToHiragana(segment.slice(segment.length - length));
		const items = symbolReadings
			.filter(({ readings }) =>
				readings.some((reading) => reading.startsWith(typed)),
			)
			.map(({ symbol, readings }) => ({
				label: `${symbol}（${readings[0]}）`,
				insert: symbol,
				from: caret - length,
			}));

		if (items.length > 0) {
			return { to: caret, items };
		}
	}

	return null;
}

function mergeCompletions(
	...completions: (RecipeTextCompletion | null)[]
): RecipeTextCompletion | null {
	const found = completions.filter(
		(completion): completion is RecipeTextCompletion => completion !== null,
	);

	if (found.length === 0) {
		return null;
	}

	return {
		to: found[0].to,
		items: found.flatMap((completion) => completion.items).slice(0, maxItems),
	};
}

// カーソルの位置に応じた、補完の候補（なければ null）。
// 見出しの補完は、後ろが空か、閉じ括弧だけのとき。ほかは、カーソルと同じ行の、後ろに文字がないときだけ出す。
// - 見出しの飾り（＜ など）を打つと、見出し
// - ＜材料＞の中の行の先頭では、カタログの食材名（ひらがなでも出る）
// - ＜下準備＞＜作り方＞の中では、材料の名前とグループ名
// - どこでも、読み仮名（ほし、すたー など）から、記号
export function getRecipeTextCompletion(
	text: string,
	caret: number,
	recipeNames: readonly string[] = [],
): RecipeTextCompletion | null {
	const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
	const lineEndIndex = text.indexOf("\n", caret);
	const after = text.slice(
		caret,
		lineEndIndex < 0 ? text.length : lineEndIndex,
	);
	const before = text.slice(lineStart, caret);

	if (before.trim() === "") {
		return null;
	}

	const headingCompletion = completeHeading(before, lineStart, caret, after);

	if (headingCompletion) {
		return headingCompletion;
	}

	// 見出し以外は、入力済みの文章の途中では、出さない（カーソルの後ろに文字がないときだけ）。
	if (after !== "") {
		return null;
	}

	const symbolCompletion = completeSymbol(before, caret);

	switch (findSection(text, lineStart)) {
		case "ingredients":
			return mergeCompletions(
				symbolCompletion,
				completeIngredientName(before, caret),
			);
		case "preparations":
		case "instructions":
			return mergeCompletions(
				symbolCompletion,
				completeRecipeName(before, caret, recipeNames),
			);
		default:
			return symbolCompletion;
	}
}

// 候補を本文に入れる。入れたあとの本文と、カーソルの位置を返す。
export function applyRecipeTextCompletion(
	text: string,
	completion: RecipeTextCompletion,
	index: number,
): { text: string; caret: number } {
	const item = completion.items[index];
	const head = text.slice(0, item.from);
	const tail = text.slice(completion.to);

	if (item.isHeading) {
		// 見出しは、入れたあと、次の行へ移る（次の行が、すでにあれば、そこへ）。
		const hasNextLine = tail.startsWith("\n");
		const nextText = `${head}${item.insert}${hasNextLine ? "" : "\n"}${tail}`;

		return { text: nextText, caret: head.length + item.insert.length + 1 };
	}

	return {
		text: `${head}${item.insert}${tail}`,
		caret: head.length + item.insert.length,
	};
}
