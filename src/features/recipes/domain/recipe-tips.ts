import { parseRecipeHeading } from "./split-recipe-sections";

// 本文の入力欄の案内（Tips）。使える機能（リンク）だけを書く。
export function buildRecipeTips(options: {
	canLinkOwn: boolean;
	canLinkOthers: boolean;
}): string[] {
	const tips = ["材料名・食材名は、入力すると補完が出ます"];

	if (options.canLinkOwn && options.canLinkOthers) {
		tips.push("[[ で自分のレシピ、[[@ で他の人のレシピをリンクできます");
	} else if (options.canLinkOwn) {
		tips.push("[[ で自分のレシピをリンクできます");
	}

	return tips;
}

export function formatRecipeTips(tips: readonly string[]): string {
	return ["Tips", ...tips.map((tip) => `・${tip}`)].join("\n");
}

// 見出しの行だけで、中身がまだ何もない（見出しの雛形のまま）か。
export function hasOnlyHeadings(text: string): boolean {
	const lines = text.split("\n").filter((line) => line.trim() !== "");

	return (
		lines.length > 0 && lines.every((line) => parseRecipeHeading(line) !== null)
	);
}
