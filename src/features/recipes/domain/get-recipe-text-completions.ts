import {
	foldIngredientSearchText,
	listIngredientSearchTerms,
	searchIngredientCatalog,
} from "#/features/ingredients/domain/ingredient-catalog";
import { filterLinkTargets } from "./filter-link-targets";
import {
	formatHeading,
	recipeHeadingLabels,
} from "./format-recipe-editor-text";
import {
	buildLinkTargetHints,
	formatLinkTargetLabel,
} from "./link-target-hints";
import {
	filterLinkableUsers,
	filterOtherRecipes,
	type LinkableUser,
	makeOtherRecipeLabelBase,
	type OtherRecipeTarget,
	parseOtherLinkQuery,
} from "./other-recipe-links";
import {
	formatLink,
	type RecipeLinkReference,
	type RecipeLinkTarget,
	resolveLinkLabel,
} from "./recipe-links";
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
	// 入れ替える範囲（カーソルの前の文字から、後ろの文字まで）。
	from: number;
	to: number;
	// 見出しの候補は、入れたあとに、次の行へ移る。
	isHeading?: boolean;
	// レシピへのリンクの候補。入れたあと、このリンク先を、リンクとして記録する。
	link?: RecipeLinkReference;
};

// リンクの補完に使う情報。targets：リンクできるレシピ、links：すでに本文で使っているラベルとリンク先。
export type RecipeLinkContext = {
	targets: readonly RecipeLinkTarget[];
	links: readonly RecipeLinkReference[];
	// 他の人のレシピへのリンク（[[@ユーザー/…）の候補。渡すと、@ の補完が使える。users：打った文字に合うユーザー、recipes：選んだユーザーの全体公開レシピ。
	others?: {
		users: readonly LinkableUser[];
		recipes: readonly OtherRecipeTarget[];
	};
};

const emptyLinkContext: RecipeLinkContext = { targets: [], links: [] };

export type RecipeTextCompletion = {
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

const headingKinds: RecipeSectionKind[] = [
	"preparations",
	"ingredients",
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

// カーソルが、閉じていない [[ の中にあるか（[[ のあとに、括弧と改行がない）。
function isInsideOpenLink(before: string): boolean {
	const open = before.lastIndexOf("[[");

	return open >= 0 && !/[[\]\n]/u.test(before.slice(open + 2));
}

// [[ のあとに打った文字で、自分のレシピの候補を出す。書き終えた名前でも出す（選んで、リンク先を決めるため）。
// カーソルの後ろに、すぐ ]] があれば、その手前の文字も、打った文字とみなし、]] まで置き換える。
function completeRecipeLink(
	before: string,
	after: string,
	lineStart: number,
	caret: number,
	linkContext: RecipeLinkContext,
): RecipeTextCompletion | null {
	const open = before.lastIndexOf("[[");
	const typed = before.slice(open + 2);
	const closed = after.match(/^([^[\]\n]*)\]\]/u);
	const afterPart = closed?.[1] ?? "";
	const replaceFrom = lineStart + open;
	const replaceTo = caret + afterPart.length + (closed ? 2 : 0);
	const otherQuery = linkContext.others
		? parseOtherLinkQuery(`${typed}${afterPart}`)
		: null;

	// [[@ から始まる入力は、他の人のレシピ。ユーザーを選び、そのユーザーのレシピを選ぶ。
	if (otherQuery && linkContext.others) {
		if (otherQuery.stage === "users") {
			const users = filterLinkableUsers(
				linkContext.others.users,
				otherQuery.query,
				maxItems,
			);

			return users.length === 0
				? null
				: {
						items: users.map((user) => ({
							label: `${user.name}（@${user.handle}）`,
							// ユーザーを選んだら、続けて、そのユーザーのレシピを選ぶ。
							insert: `[[@${user.handle}/`,
							from: replaceFrom,
							to: replaceTo,
						})),
					};
		}

		const recipes = filterOtherRecipes(
			linkContext.others.recipes,
			otherQuery.handle,
			otherQuery.query,
			maxItems,
		);

		if (recipes.length === 0) {
			return null;
		}

		const hints = buildLinkTargetHints(
			linkContext.others.recipes.filter(
				(recipe) => recipe.authorHandle === otherQuery.handle,
			),
		);

		return {
			items: recipes.map((recipe) => {
				const label = resolveLinkLabel(
					makeOtherRecipeLabelBase(recipe.authorName, recipe.name),
					recipe.publicId,
					linkContext.links,
				);

				return {
					label: formatLinkTargetLabel(recipe, hints),
					insert: formatLink(label),
					from: replaceFrom,
					to: replaceTo,
					link: { label, targetPublicId: recipe.publicId },
				};
			}),
		};
	}

	const targets = filterLinkTargets(
		linkContext.targets,
		`${typed}${afterPart}`,
		maxItems,
	);

	if (targets.length === 0) {
		return null;
	}

	// 同じ名前のレシピが複数あるときは、候補の表示に、登録日を添える。
	const hints = buildLinkTargetHints(linkContext.targets);

	return {
		items: targets.map((target) => {
			const label = resolveLinkLabel(
				target.name,
				target.publicId,
				linkContext.links,
			);

			return {
				label: formatLinkTargetLabel(target, hints),
				insert: formatLink(label),
				from: lineStart + open,
				to: caret + afterPart.length + (closed ? 2 : 0),
				link: { label, targetPublicId: target.publicId },
			};
		}),
	};
}

function completeHeading(
	before: string,
	lineStart: number,
	caret: number,
	after: string,
): RecipeTextCompletion | null {
	const match = before.match(headingOpenerPattern);
	// カーソルの後ろは、見出しの文字（と、閉じ括弧）だけのとき。それ以外は、見出しではない。
	const afterMatch = after.match(/^([^＞>】\]］》〉]*)([＞>】\]］》〉])?$/u);

	if (!match || !afterMatch) {
		return null;
	}

	// カーソルの前後の文字を合わせたものが、打った文字列。
	const typed = `${match[2]}${afterMatch[1]}`.trim();
	const items = headingKinds
		.filter((kind) => recipeHeadingLabels[kind].startsWith(typed))
		// 書き終えた見出し（＜｜材料＞、＜材料｜＞）は、出さない。
		.filter((kind) => after === "" || recipeHeadingLabels[kind] !== typed)
		.map((kind) => ({
			label: formatHeading(kind),
			insert: formatHeading(kind),
			from: lineStart + match[1].length,
			to: caret + after.length,
			isHeading: true,
		}));

	return items.length === 0 ? null : { items };
}

function completeIngredientName(
	before: string,
	after: string,
	caret: number,
): RecipeTextCompletion | null {
	// 行頭の箇条書きの印と、グループの印（☆ など）は、材料名ではないので除く。
	const token = before
		.trimStart()
		.replace(bulletPattern, "")
		.replace(groupSymbolPattern, "")
		.trimStart();

	if (token === "" || nameBreakPattern.test(token)) {
		return null;
	}

	// カーソルの後ろに続く文字（分量などの手前まで）も、打った文字列に含める。
	const afterToken = takeWhile(after, (char) => !nameBreakPattern.test(char));
	const typed = `${token}${afterToken}`;
	const items = searchIngredientCatalog(typed, maxItems + 1)
		.filter((entry) => entry.name !== typed)
		.slice(0, maxItems)
		.map((entry) => ({
			label: entry.name,
			insert: entry.name,
			from: caret - token.length,
			to: caret + afterToken.length,
		}));

	return items.length === 0 ? null : { items };
}

// 文字列の先頭から、条件に合う文字が続く部分（上限つき）。
function takeWhile(
	text: string,
	isIncluded: (char: string) => boolean,
	limit = Number.POSITIVE_INFINITY,
): string {
	let end = 0;

	while (end < text.length && end < limit && isIncluded(text[end])) {
		end += 1;
	}

	return text.slice(0, end);
}

// 文字列の末尾から、条件に合う文字が続く部分（上限つき）。
function takeWhileEnd(
	text: string,
	isIncluded: (char: string) => boolean,
	limit: number,
): string {
	let start = text.length;

	while (
		start > 0 &&
		text.length - start < limit &&
		isIncluded(text[start - 1])
	) {
		start -= 1;
	}

	return text.slice(start);
}

// カーソルの前の文字（1文字以上）と、後ろの文字を合わせた長さが、長い順に並べた組み合わせ。
function* listTypedSpans(
	segment: string,
	afterSegment: string,
	minLength: number,
): Generator<{ before: number; after: number }> {
	for (
		let total = segment.length + afterSegment.length;
		total >= minLength;
		total -= 1
	) {
		for (
			let before = Math.min(total, segment.length);
			before >= Math.max(1, total - afterSegment.length);
			before -= 1
		) {
			yield { before, after: total - before };
		}
	}
}

// 作り方・下準備の中で、材料名（と、カタログにある食材の別名・読み仮名）の始まりを、カーソルの前後の文字から探して、その材料名を出す。
function completeRecipeName(
	before: string,
	after: string,
	caret: number,
	recipeNames: readonly string[],
): RecipeTextCompletion | null {
	const segment = takeWhileEnd(
		before,
		(char) => !segmentBreakPattern.test(char),
		maxSegmentLength,
	);
	const afterSegment = takeWhile(
		after,
		(char) => !segmentBreakPattern.test(char),
		maxSegmentLength,
	);
	const candidates: RecipeTextCompletionItem[] = [];

	for (const name of new Set(recipeNames)) {
		const foldedName = foldIngredientSearchText(name);
		const terms = [foldedName, ...listIngredientSearchTerms(name)];

		// カーソルの前後の文字が、名前・別名・読み仮名の始まりと一致する、いちばん長い部分。
		for (const span of listTypedSpans(segment, afterSegment, 2)) {
			const typed = foldIngredientSearchText(
				segment.slice(segment.length - span.before) +
					afterSegment.slice(0, span.after),
			);

			// 材料名を、書き終えているときは、出さない。
			if (typed === foldedName) {
				break;
			}

			if (terms.some((term) => term.startsWith(typed))) {
				candidates.push({
					label: name,
					insert: name,
					from: caret - span.before,
					to: caret + span.after,
				});
				break;
			}
		}
	}

	if (candidates.length === 0) {
		return null;
	}

	return {
		items: candidates
			.sort((a, b) => b.to - b.from - (a.to - a.from))
			.slice(0, maxItems),
	};
}

// カーソルの前後の「ほし」「すたー」のような読み仮名から、記号の候補を出す（2文字以上）。
function completeSymbol(
	before: string,
	after: string,
	caret: number,
): RecipeTextCompletion | null {
	const segment = takeWhileEnd(
		before,
		(char) => !segmentBreakPattern.test(char),
		maxSymbolReadingLength,
	);
	const afterSegment = takeWhile(
		after,
		(char) => !segmentBreakPattern.test(char),
		maxSymbolReadingLength,
	);

	for (const span of listTypedSpans(
		segment,
		afterSegment,
		minSymbolReadingLength,
	)) {
		const typed = foldToHiragana(
			segment.slice(segment.length - span.before) +
				afterSegment.slice(0, span.after),
		);
		const items = symbolReadings
			.filter(({ readings }) =>
				readings.some((reading) => reading.startsWith(typed)),
			)
			.map(({ symbol, readings }) => ({
				label: `${symbol}（${readings[0]}）`,
				insert: symbol,
				from: caret - span.before,
				to: caret + span.after,
			}));

		if (items.length > 0) {
			return { items };
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
		items: found.flatMap((completion) => completion.items).slice(0, maxItems),
	};
}

// カーソルの位置に応じた、補完の候補（なければ null）。
// 打った文字列は、カーソルの前の文字と、すぐ後ろに続く文字を合わせたもの（前に1文字以上、合計2文字以上。見出しは0文字から）。
// 書き終えた名前・見出し（＜｜材料＞、ト｜マト）では出さず、途中（＜｜材、トマ｜を切る）では出す。
// - 見出しの飾り（＜ など）を打つと、見出し
// - ＜材料＞の中の行の先頭では、カタログの食材名（ひらがなでも出る）
// - ＜下準備＞＜作り方＞の中では、材料の名前とグループ名
// - どこでも、読み仮名（ほし、すたー など）から、記号
export function getRecipeTextCompletion(
	text: string,
	caret: number,
	recipeNames: readonly string[] = [],
	linkContext: RecipeLinkContext = emptyLinkContext,
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

	// [[ の中では、レシピへのリンクの候補だけを出す（ほかの補完は、出さない）。
	if (isInsideOpenLink(before)) {
		return completeRecipeLink(before, after, lineStart, caret, linkContext);
	}

	const headingCompletion = completeHeading(before, lineStart, caret, after);

	if (headingCompletion) {
		return headingCompletion;
	}

	const symbolCompletion = completeSymbol(before, after, caret);

	switch (findSection(text, lineStart)) {
		case "ingredients":
			return mergeCompletions(
				symbolCompletion,
				completeIngredientName(before, after, caret),
			);
		case "preparations":
		case "instructions":
			return mergeCompletions(
				symbolCompletion,
				completeRecipeName(before, after, caret, recipeNames),
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
	const tail = text.slice(item.to);

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

// 変換中に候補を決めたとき、変換の確定で本文の長さが変わった分（delta）だけ、置き換える範囲をずらす。
// 変換の始まり（start）より前から始まる範囲は、始まりを動かさない。
export function adjustCompletionItem(
	item: RecipeTextCompletionItem,
	composition: { start: number; delta: number },
): RecipeTextCompletionItem {
	const to = Math.max(0, item.to + composition.delta);
	const from =
		item.from <= composition.start
			? item.from
			: Math.min(Math.max(0, item.from + composition.delta), to);

	return { ...item, from, to };
}
