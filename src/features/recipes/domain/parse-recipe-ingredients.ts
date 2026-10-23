import {
	type ParsedIngredientLine,
	parseIngredientLine,
} from "#/features/ingredients/domain/parse-ingredient-line";
import { splitTextByLinks } from "./recipe-links";

export type ParsedRecipeIngredientItem = ParsedIngredientLine & {
	type: "ingredient";
};

export type ParsedRecipeIngredientGroup = {
	type: "group";
	name: string;
	rawText: string;
	inferred: boolean;
	children: ParsedRecipeIngredientItem[];
};

export type ParsedRecipeIngredientNode =
	| ParsedRecipeIngredientItem
	| ParsedRecipeIngredientGroup;

type ResolvedLine = {
	item: ParsedRecipeIngredientItem;
	consumedLineCount: number;
};

function toIngredientItem(
	parsedLine: ParsedIngredientLine,
	rawText = parsedLine.rawText,
): ParsedRecipeIngredientItem {
	return {
		...parsedLine,
		type: "ingredient",
		rawText,
	};
}

function resolveLine(lines: readonly string[], index: number): ResolvedLine {
	const currentLine = lines[index];
	const parsedCurrentLine = parseIngredientLine(currentLine);

	if (!parsedCurrentLine) {
		throw new Error("空行は事前に除外してください");
	}

	if (parsedCurrentLine.status === "parsed") {
		return {
			item: toIngredientItem(parsedCurrentLine),
			consumedLineCount: 1,
		};
	}

	const nextLine = lines[index + 1];

	if (nextLine) {
		const combinedLine = parseIngredientLine(
			`${parsedCurrentLine.name}: ${nextLine}`,
		);

		if (
			combinedLine?.status === "parsed" &&
			combinedLine.name === parsedCurrentLine.name
		) {
			return {
				item: toIngredientItem(combinedLine, `${currentLine}\n${nextLine}`),
				consumedLineCount: 2,
			};
		}
	}

	return {
		item: toIngredientItem(parsedCurrentLine),
		consumedLineCount: 1,
	};
}

function resolveLines(lines: readonly string[]): ParsedRecipeIngredientItem[] {
	const items: ParsedRecipeIngredientItem[] = [];

	let index = 0;

	while (index < lines.length) {
		const resolvedLine = resolveLine(lines, index);

		items.push(resolvedLine.item);
		index += resolvedLine.consumedLineCount;
	}

	return items;
}

// 「A」「B」「★」のように、ラベルだけの行。行ごとに繰り返されるため、同じ名前なら同じグループにまとめる。
const groupLabelPattern = /^(?:[A-H1-9]|[☆★◎○●◆◇■□▲△])$/iu;

// 先頭が、グループの印の記号の行（「☆ソース」）。材料の名前としては、読まない。
const leadingGroupSymbolPattern = /^[☆★◎○●◆◇■□▲△]/u;

// 分量のない行が、材料の行として扱えるか（「A」「☆ソース」のような、グループの印の行は、扱えない）。
export function canBeIngredientLine(line: string): boolean {
	const name = line.normalize("NFKC").trim();

	return (
		name.length > 0 &&
		!groupLabelPattern.test(name) &&
		!leadingGroupSymbolPattern.test(name)
	);
}

// 他のレシピへのリンク（[[名前]]）は、分量がなくても、見出しではなく、材料（レシピ名だけで書く）。
function isLinkIngredient(node: ParsedRecipeIngredientNode): boolean {
	return (
		node.type === "ingredient" &&
		splitTextByLinks(node.name).some((segment) => segment.type === "link")
	);
}

// グループの中に入れる行（分量のある材料と、リンクの材料）。
function isGroupChild(
	node: ParsedRecipeIngredientNode | undefined,
): node is ParsedRecipeIngredientItem {
	return (
		node?.type === "ingredient" &&
		(node.status === "parsed" || isLinkIngredient(node))
	);
}

function groupResolvedNodes(
	nodes: readonly ParsedRecipeIngredientNode[],
	plainLines: ReadonlySet<string>,
): ParsedRecipeIngredientNode[] {
	const groupedNodes: ParsedRecipeIngredientNode[] = [];

	let index = 0;

	while (index < nodes.length) {
		const node = nodes[index];
		const nextNode = nodes[index + 1];

		if (
			node.type === "ingredient" &&
			node.status === "missing-amount" &&
			!isLinkIngredient(node) &&
			!plainLines.has(node.rawText) &&
			isGroupChild(nextNode)
		) {
			const children: ParsedRecipeIngredientItem[] = [];

			let childIndex = index + 1;

			while (childIndex < nodes.length) {
				const childNode = nodes[childIndex];

				if (!isGroupChild(childNode)) {
					break;
				}

				children.push(childNode);
				childIndex += 1;
			}

			const existingLabelGroup = groupLabelPattern.test(node.name)
				? groupedNodes.find(
						(groupedNode): groupedNode is ParsedRecipeIngredientGroup =>
							groupedNode.type === "group" &&
							groupedNode.inferred &&
							groupedNode.name === node.name,
					)
				: undefined;

			if (existingLabelGroup) {
				existingLabelGroup.children.push(...children);
			} else {
				groupedNodes.push({
					type: "group",
					name: node.name,
					rawText: node.rawText,
					inferred: true,
					children,
				});
			}

			index = childIndex;
			continue;
		}

		groupedNodes.push(node);
		index += 1;
	}

	return groupedNodes;
}

type IngredientPrefixCandidate = {
	prefix: string;
	ingredientName: string;
	explicit: boolean;
};

const explicitPrefixPatterns = [
	/^\[([A-H1-9])\]\s*(.+)$/iu,
	/^【([A-H1-9])】\s*(.+)$/iu,
	/^\(([A-H1-9])\)\s*(.+)$/iu,
	/^([A-H1-9])[:：]\s*(.+)$/iu,
	// 材料名の先頭に自然に現れない記号は、1行だけでもグループの印として扱う。
	// ※・•*＊ は注記や箇条書きの印なので含めない。
	/^([☆★◎○●◆◇■□▲△])\s*(.+)$/u,
];

const compactPrefixPattern = /^([A-H1-9])(.+)$/iu;

function findIngredientPrefix(name: string): IngredientPrefixCandidate | null {
	const normalizedName = name.normalize("NFKC").trim();

	for (const pattern of explicitPrefixPatterns) {
		const match = normalizedName.match(pattern);

		if (match) {
			return {
				prefix: match[1].toLocaleUpperCase("ja-JP"),
				ingredientName: match[2].trim(),
				explicit: true,
			};
		}
	}

	const compactMatch = normalizedName.match(compactPrefixPattern);

	if (!compactMatch) {
		return null;
	}

	return {
		prefix: compactMatch[1].toLocaleUpperCase("ja-JP"),
		ingredientName: compactMatch[2].trim(),
		explicit: false,
	};
}

function groupPrefixedItems(
	items: readonly ParsedRecipeIngredientItem[],
): ParsedRecipeIngredientNode[] {
	const candidates = items.map((item) =>
		item.status === "parsed" ? findIngredientPrefix(item.name) : null,
	);

	const compactCandidateCount = candidates.filter(
		(candidate) => candidate && !candidate.explicit,
	).length;

	const result: ParsedRecipeIngredientNode[] = [];
	const groups = new Map<string, ParsedRecipeIngredientGroup>();

	for (const [index, item] of items.entries()) {
		const candidate = candidates[index];

		if (!candidate || (!candidate.explicit && compactCandidateCount < 2)) {
			result.push(item);
			continue;
		}

		const ingredient = {
			...item,
			name: candidate.ingredientName,
		};

		const existingGroup = groups.get(candidate.prefix);

		if (existingGroup) {
			existingGroup.children.push(ingredient);
			continue;
		}

		const group: ParsedRecipeIngredientGroup = {
			type: "group",
			name: candidate.prefix,
			rawText: candidate.prefix,
			inferred: true,
			children: [ingredient],
		};

		groups.set(candidate.prefix, group);
		result.push(group);
	}

	return result;
}

export type ParseRecipeIngredientsOptions = {
	// グループにせず、材料として読む行（分量のない行を、ユーザーが材料と決めたもの）。
	plainLines?: readonly string[];
};

export function parseRecipeIngredients(
	input: string,
	options: ParseRecipeIngredientsOptions = {},
): ParsedRecipeIngredientNode[] {
	const lines = input
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	return groupResolvedNodes(
		groupPrefixedItems(resolveLines(lines)),
		new Set(options.plainLines ?? []),
	);
}
