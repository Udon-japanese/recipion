import {
	parseRecipeHeading,
	type RecipeSectionKind,
} from "./split-recipe-sections";

// 案内（Tips）を出す場所：見出しの下が、まだ何も書かれていないときの、見出しの次の行の先頭。
export type RecipeTipSlot = {
	kind: RecipeSectionKind;
	// 見出しの次の行の先頭の位置（本文の index）。
	offset: number;
};

export function findRecipeTipSlots(text: string): RecipeTipSlot[] {
	const lines = text.split("\n");
	const starts: number[] = [];
	let position = 0;

	for (const line of lines) {
		starts.push(position);
		position += line.length + 1;
	}

	const slots: RecipeTipSlot[] = [];

	lines.forEach((line, index) => {
		const heading = parseRecipeHeading(line);

		// 見出しの次の行がなければ、出す場所がない。
		if (!heading || index + 1 >= lines.length) {
			return;
		}

		// 次の見出しまでの行が、すべて空なら、その見出しの下は、空。
		for (let next = index + 1; next < lines.length; next += 1) {
			const nextLine = lines[next] ?? "";

			if (parseRecipeHeading(nextLine) !== null) {
				break;
			}

			if (nextLine.trim() !== "") {
				return;
			}
		}

		slots.push({ kind: heading.kind, offset: starts[index + 1] ?? 0 });
	});

	return slots;
}
