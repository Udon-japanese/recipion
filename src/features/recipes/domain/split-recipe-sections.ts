import {
	isIngredientGroupEndLine,
	parseRecipeIngredients,
} from "./parse-recipe-ingredients";
import { maxRecipeYieldLength, parseRecipeYield } from "./recipe-yield";

export type RecipeSectionKind =
	| "ingredients"
	| "preparations"
	| "instructions"
	| "note";

export type SplitRecipeSections = {
	ingredientText: string;
	preparationText: string;
	instructionText: string;
	note: string;
	// 「材料（2人分）」「材料（12個分）」のような見出しの括弧から読み取った、できあがりの量。なければ null。
	yieldText: string | null;
	// 見出しも番号もなく、種類を決められなかったブロック。
	unclassifiedBlocks: string[];
	// 見出しが1つでもあったか（なければ、ブロックごとに自動で判定している）。
	hasHeadings: boolean;
};

const headingKeywords: Record<string, RecipeSectionKind> = {
	材料: "ingredients",
	下準備: "preparations",
	下ごしらえ: "preparations",
	下処理: "preparations",
	作り方: "instructions",
	つくり方: "instructions",
	手順: "instructions",
	メモ: "note",
	ポイント: "note",
	コツ: "note",
	備考: "note",
};

const keywordPattern = Object.keys(headingKeywords).join("|");

// ＜材料＞ <材料> 【材料】 ■材料 [材料] 材料: 材料（2人分） など。飾りは、前後どちらにも付けてよい。
const headingPattern = new RegExp(
	String.raw`^[＜<【\[［■□◆◇▼▽●○◎＃#《〈]*\s*(${keywordPattern})\s*(?:[（(]([^）)]*)[）)])?\s*[＞>】\]］》〉]*\s*[:：]?$`,
	"u",
);

export type RecipeHeading = {
	kind: RecipeSectionKind;
	yieldText: string | null;
};

// 見出しの括弧の中身を、できあがりの量として読む（数がある「2人分」「型1台分」、または「作りやすい分量」のような「〜分（量）」）。
function readHeadingYield(content: string | undefined): string | null {
	const text = content?.trim() ?? "";

	if (text === "" || text.length > maxRecipeYieldLength) {
		return null;
	}

	return parseRecipeYield(text) !== null || /分量?$/u.test(text) ? text : null;
}

export function parseRecipeHeading(line: string): RecipeHeading | null {
	const match = line.normalize("NFKC").trim().match(headingPattern);

	if (!match) {
		return null;
	}

	return {
		kind: headingKeywords[match[1]],
		yieldText: readHeadingYield(match[2]),
	};
}

// 材料の行頭の箇条書きの印（・ ● - * •）を外す。
const bulletPattern = /^[・●◦•\-*]\s*/u;

// グループの終わりの行（---）は、印ではないので、そのまま残す。
function stripBullets(text: string): string {
	return text
		.split(/\r?\n/u)
		.map((line) =>
			isIngredientGroupEndLine(line)
				? line.trim()
				: line.trim().replace(bulletPattern, ""),
		)
		.join("\n");
}

// 番号つきの作り方の行（1. / 1) / 1、/ ①）。「1 1/2本」のような、空白だけの区切りは、材料の分量と紛れるため、含めない。
const numberedInstructionPattern = /^(?:\d+\s*[.．):）、]|[①-⑳])/u;

const sentenceEndPattern = /[。！？]/u;

function nonEmptyLines(block: string): string[] {
	return block
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function isNumberedInstructionBlock(lines: readonly string[]): boolean {
	return numberedInstructionPattern.test(lines[0].normalize("NFKC"));
}

// 名前だけの行（グループの見出し・分量が次の行にある材料名）として許す長さ。
const maxNameOnlyLength = 20;

function isIngredientBlock(block: string): boolean {
	const lines = nonEmptyLines(stripBullets(block));

	if (
		lines.length === 0 ||
		lines.some((line) => sentenceEndPattern.test(line))
	) {
		return false;
	}

	let parsedCount = 0;

	for (const node of parseRecipeIngredients(lines.join("\n"))) {
		const items = node.type === "group" ? node.children : [node];

		if (node.type === "group" && node.name.length > maxNameOnlyLength) {
			return false;
		}

		for (const item of items) {
			if (item.status === "parsed") {
				parsedCount += 1;
			} else if (item.name.length > maxNameOnlyLength) {
				return false;
			}
		}
	}

	return parsedCount > 0;
}

// 見出しのない、空行で区切ったブロックの種類（決められなければ null）。
export function classifyRecipeBlock(
	block: string,
): "ingredients" | "instructions" | null {
	const blockLines = nonEmptyLines(block);

	if (blockLines.length === 0) {
		return null;
	}

	if (isNumberedInstructionBlock(blockLines)) {
		return "instructions";
	}

	if (isIngredientBlock(block)) {
		return "ingredients";
	}

	// 分量の読めない文章が続くブロックは、作り方とみなす。
	if (blockLines.length >= 2 || sentenceEndPattern.test(block)) {
		return "instructions";
	}

	return null;
}

function splitBlocks(text: string): string[] {
	return text
		.split(/\r?\n\s*\r?\n/u)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);
}

function appendText(current: string, addition: string): string {
	return current === "" ? addition : `${current}\n${addition}`;
}

export function splitRecipeSections(input: string): SplitRecipeSections {
	const lines = input.split(/\r?\n/u);
	const headings = lines.map((line) => parseRecipeHeading(line));
	const hasHeadings = headings.some((heading) => heading !== null);

	const result: SplitRecipeSections = {
		ingredientText: "",
		preparationText: "",
		instructionText: "",
		note: "",
		yieldText: null,
		unclassifiedBlocks: [],
		hasHeadings,
	};

	const sectionTexts: Record<RecipeSectionKind, string> = {
		ingredients: "",
		preparations: "",
		instructions: "",
		note: "",
	};

	if (hasHeadings) {
		let currentKind: RecipeSectionKind | null = null;
		let currentLines: string[] = [];

		const flush = () => {
			const text = currentLines.join("\n").trim();

			if (text === "") {
				return;
			}

			if (currentKind === null) {
				// 最初の見出しより前の文章は、種類を決められない。
				result.unclassifiedBlocks.push(...splitBlocks(text));
			} else {
				sectionTexts[currentKind] = appendText(sectionTexts[currentKind], text);
			}
		};

		for (const [index, line] of lines.entries()) {
			const heading = headings[index];

			if (heading) {
				flush();
				currentKind = heading.kind;
				currentLines = [];
				result.yieldText = result.yieldText ?? heading.yieldText;
				continue;
			}

			currentLines.push(line);
		}

		flush();
	} else {
		// 見出しがないときは、空行で区切ったブロックごとに、種類を決める。
		for (const block of splitBlocks(input)) {
			const kind = classifyRecipeBlock(block);

			if (kind === null) {
				// 分量のない短い1行は、決めない（レシピ名や、見出しの書き忘れの可能性がある）。
				result.unclassifiedBlocks.push(block);
			} else {
				sectionTexts[kind] = appendText(sectionTexts[kind], block);
			}
		}
	}

	result.ingredientText = stripBullets(sectionTexts.ingredients);
	result.preparationText = sectionTexts.preparations;
	result.instructionText = sectionTexts.instructions;
	result.note = sectionTexts.note;

	return result;
}
