import { describe, expect, it } from "vitest";
import { createForkDocument } from "./create-fork-document";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import { createRecipeSnapshot } from "./recipe-snapshot";

function sequentialIds(prefix: string) {
	let count = 0;

	return () => `${prefix}-${++count}`;
}

describe("createForkDocument", () => {
	const created = createRecipeEditorDocument(
		{
			name: "ケークサレ",
			yieldText: "1台",
			ingredientText: "☆生地\n薄力粉 100g\n卵 2個\n---\nベーコン 50g",
			preparationText: "オーブンを温める",
			instructionText: "1. 混ぜる\n2. 焼く",
			note: "焼きすぎない",
			links: [{ label: "ソース", targetPublicId: "sauce" }],
			visibility: "public",
			stocksWhenMade: true,
			scalable: false,
			publicTags: ["main_dish", "bento"],
			personalTags: ["週末"],
		},
		sequentialIds("parent"),
	);
	const parent = {
		...created,
		instructions: created.instructions.map((instruction, index) =>
			index === 1
				? {
						...instruction,
						referencedInstructionIds: [created.instructions[0]?.id ?? ""],
					}
				: instruction,
		),
	};

	it("中身と設定はそのまま写し、公開範囲だけ非公開にする", () => {
		const fork = createForkDocument(parent, sequentialIds("fork"));

		expect(createRecipeSnapshot(fork)).toEqual(createRecipeSnapshot(parent));
		expect(fork).toMatchObject({
			name: "ケークサレ",
			links: [{ label: "ソース", targetPublicId: "sauce" }],
			visibility: "private",
			stocksWhenMade: true,
			scalable: false,
		});
	});

	it("公開用のタグは写し、個人用のタグ（親の作者のもの）は写さない", () => {
		const fork = createForkDocument(parent, sequentialIds("fork"));

		expect(fork.publicTags).toEqual(["main_dish", "bento"]);
		expect(fork.personalTags).toEqual([]);
	});

	it("材料・下準備・作り方の ID は作り直し、作り方の参照も付け替える", () => {
		const fork = createForkDocument(parent, sequentialIds("fork"));
		const ids = JSON.stringify([
			fork.ingredients,
			fork.preparations,
			fork.instructions,
		]);

		expect(ids).not.toContain("parent-");
		expect(fork.instructions[1]?.referencedInstructionIds).toEqual([
			fork.instructions[0]?.id,
		]);
	});
});
