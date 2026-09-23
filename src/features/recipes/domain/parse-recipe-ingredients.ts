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

function groupResolvedItems(
	items: readonly ParsedRecipeIngredientItem[],
): ParsedRecipeIngredientNode[] {
	const nodes: ParsedRecipeIngredientNode[] = [];

	let index = 0;

	while (index < items.length) {
		const item = items[index];
		const nextItem = items[index + 1];

		if (item.status === "missing-amount" && nextItem?.status === "parsed") {
			const children: ParsedRecipeIngredientItem[] = [];

			let childIndex = index + 1;

			while (
				childIndex < items.length &&
				items[childIndex].status === "parsed"
			) {
				children.push(items[childIndex]);
				childIndex += 1;
			}

			nodes.push({
				type: "group",
				name: item.name,
				rawText: item.rawText,
				inferred: true,
				children,
			});

			index = childIndex;
			continue;
		}

		nodes.push(item);
		index += 1;
	}

	return nodes;
}

export function parseRecipeIngredients(
	input: string,
): ParsedRecipeIngredientNode[] {
	const lines = input
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	return groupResolvedItems(resolveLines(lines));
}
