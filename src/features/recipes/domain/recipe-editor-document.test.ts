import { describe, expect, it } from "vitest";

import { createRecipeEditorDocument } from "./recipe-editor-document";

function createSequentialIdFactory() {
	let currentId = 0;

	return () => {
		currentId += 1;

		return `id-${currentId}`;
	};
}

describe("createRecipeEditorDocument", () => {
	it("貼り付けた文章から編集用レシピを作る", () => {
		const document = createRecipeEditorDocument(
			{
				name: " ハンバーグ ",
				servings: 2,
				ingredientText: `
					肉だね
					豚ひき肉 200g
					玉ねぎ 1/2個
					卵 1個
				`,
				preparationText: `
					□ 玉ねぎはみじん切りにする
					□ 卵は溶いておく
				`,
				instructionText: `
					1. 肉だねの材料を混ぜる
					2. 小判形に成形する
					3. フライパンで焼く
				`,
				note: " 焼きすぎない ",
			},
			createSequentialIdFactory(),
		);

		expect(document).toEqual({
			name: "ハンバーグ",
			servings: 2,
			ingredients: [
				expect.objectContaining({
					id: "id-1",
					type: "group",
					name: "肉だね",
					children: [
						expect.objectContaining({
							id: "id-2",
							type: "ingredient",
							name: "豚ひき肉",
							quantity: 200,
							unitLabel: "g",
						}),
						expect.objectContaining({
							id: "id-3",
							type: "ingredient",
							name: "玉ねぎ",
							quantity: 0.5,
							unitLabel: "個",
						}),
						expect.objectContaining({
							id: "id-4",
							type: "ingredient",
							name: "卵",
							quantity: 1,
							unitLabel: "個",
						}),
					],
				}),
			],
			preparations: [
				{
					id: "id-5",
					text: "玉ねぎはみじん切りにする",
				},
				{
					id: "id-6",
					text: "卵は溶いておく",
				},
			],
			instructions: [
				{
					id: "id-7",
					text: "肉だねの材料を混ぜる",
					referencedInstructionIds: [],
				},
				{
					id: "id-8",
					text: "小判形に成形する",
					referencedInstructionIds: [],
				},
				{
					id: "id-9",
					text: "フライパンで焼く",
					referencedInstructionIds: [],
				},
			],
			note: "焼きすぎない",
		});
	});

	it("空の入力から編集可能な初期状態を作る", () => {
		expect(createRecipeEditorDocument({}, createSequentialIdFactory())).toEqual(
			{
				name: "",
				servings: 2,
				ingredients: [],
				preparations: [],
				instructions: [],
				note: "",
			},
		);
	});

	it("材料グループと材料に別々の固定IDを付ける", () => {
		const document = createRecipeEditorDocument(
			{
				ingredientText: `
					Aしょうゆ 大さじ1
					A砂糖 小さじ1
				`,
			},
			createSequentialIdFactory(),
		);

		const group = document.ingredients[0];

		expect(group).toEqual(
			expect.objectContaining({
				id: "id-1",
				type: "group",
			}),
		);

		if (group?.type !== "group") {
			throw new Error("材料グループが作成されていません");
		}

		expect(group.children).toEqual([
			expect.objectContaining({
				id: "id-2",
				name: "しょうゆ",
			}),
			expect.objectContaining({
				id: "id-3",
				name: "砂糖",
			}),
		]);
	});
});
