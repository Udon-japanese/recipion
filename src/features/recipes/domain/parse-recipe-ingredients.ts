import {
	type ParsedRecipeIngredientLine,
	parseRecipeIngredientLine,
} from "./parse-recipe-ingredient-line";

export type ParsedRecipeIngredientItem = ParsedRecipeIngredientLine & {
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
	parsedLine: ParsedRecipeIngredientLine,
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
	const parsedCurrentLine = parseRecipeIngredientLine(currentLine);

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
		const combinedLine = parseRecipeIngredientLine(
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

function groupResolvedNodes(
	nodes: readonly ParsedRecipeIngredientNode[],
): ParsedRecipeIngredientNode[] {
	const groupedNodes: ParsedRecipeIngredientNode[] = [];

	let index = 0;

	while (index < nodes.length) {
		const node = nodes[index];
		const nextNode = nodes[index + 1];

		if (
			node.type === "ingredient" &&
			node.status === "missing-amount" &&
			nextNode?.type === "ingredient" &&
			nextNode.status === "parsed"
		) {
			const children: ParsedRecipeIngredientItem[] = [];

			let childIndex = index + 1;

			while (childIndex < nodes.length) {
				const childNode = nodes[childIndex];

				if (childNode.type !== "ingredient" || childNode.status !== "parsed") {
					break;
				}

				children.push(childNode);
				childIndex += 1;
			}

			groupedNodes.push({
				type: "group",
				name: node.name,
				rawText: node.rawText,
				inferred: true,
				children,
			});

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

export function parseRecipeIngredients(
	input: string,
): ParsedRecipeIngredientNode[] {
	const lines = input
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	return groupResolvedNodes(groupPrefixedItems(resolveLines(lines)));
}
