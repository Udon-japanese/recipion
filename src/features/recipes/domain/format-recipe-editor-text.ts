// 保存済みの下準備・作り方を、エディタの入力欄（textarea）へ戻すための文字列にする。
// parseRecipePreparations / parseRecipeInstructions で読み戻すと、元の項目に戻る。
// 複数行の項目も、先頭に印を付けることで、1つの項目として戻る。

export function formatPreparationText(
	preparations: readonly { text: string }[],
): string {
	return preparations.map((preparation) => `- ${preparation.text}`).join("\n");
}

export function formatInstructionText(
	instructions: readonly { text: string }[],
): string {
	return instructions
		.map((instruction, index) => `${index + 1}. ${instruction.text}`)
		.join("\n");
}

const groupSymbolPattern = /^[☆★◎○●◆◇■□▲△]/u;

// 材料の1行（グループの子は、字下げなし）。分量がなければ、名前だけ。
export function formatIngredientLine(item: {
	name: string;
	amountText: string | null;
}): string {
	return item.amountText ? `${item.name} ${item.amountText}` : item.name;
}

export function formatIngredientGroupLine(name: string): string {
	return groupSymbolPattern.test(name) ? name : `☆${name}`;
}

type FormattableIngredientNode =
	| { type: "ingredient"; name: string; amountText: string | null }
	| {
			type: "group";
			name: string;
			children: readonly FormattableIngredientNode[];
	  };

export function formatIngredientText(
	nodes: readonly FormattableIngredientNode[],
): string {
	const lines: string[] = [];

	for (const node of nodes) {
		if (node.type === "group") {
			lines.push(formatIngredientGroupLine(node.name));
			lines.push(
				...node.children.map((child) => formatIngredientNodeLine(child)),
			);
		} else {
			lines.push(formatIngredientLine(node));
		}
	}

	return lines.join("\n");
}

function formatIngredientNodeLine(node: FormattableIngredientNode): string {
	return node.type === "group"
		? formatIngredientGroupLine(node.name)
		: formatIngredientLine(node);
}

export type RecipeEditorTextInput = {
	ingredients: readonly FormattableIngredientNode[];
	preparations: readonly { text: string }[];
	instructions: readonly { text: string }[];
	note: string;
};

export const recipeHeadingLabels = {
	ingredients: "材料",
	preparations: "下準備",
	instructions: "作り方",
	note: "メモ",
} as const;

export function formatHeading(kind: keyof typeof recipeHeadingLabels): string {
	return `＜${recipeHeadingLabels[kind]}＞`;
}

// 見出しだけの、新規登録の雛形。
export function formatRecipeTemplateText(): string {
	return (["ingredients", "preparations", "instructions", "note"] as const)
		.map((kind) => `${formatHeading(kind)}\n`)
		.join("\n");
}

// 保存済みのレシピを、編集用の1つの文章にする（空の部分も見出しは残し、続きを書けるようにする）。
export function formatRecipeEditorText(input: RecipeEditorTextInput): string {
	const sections: [keyof typeof recipeHeadingLabels, string][] = [
		["ingredients", formatIngredientText(input.ingredients)],
		["preparations", formatPreparationText(input.preparations)],
		["instructions", formatInstructionText(input.instructions)],
		["note", input.note],
	];

	return sections
		.map(([kind, body]) => `${formatHeading(kind)}\n${body}`.trimEnd())
		.join("\n\n");
}
