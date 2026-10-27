import { describe, expect, it } from "vitest";
import { createRecipeEditorDocument } from "../domain/recipe-editor-document";
import { prepareRecipeForStorage } from "./prepare-recipe-for-storage";

const curry = { label: "カレー", targetPublicId: "curry-id" };
const rice = { label: "ごはん", targetPublicId: "rice-id" };

describe("prepareRecipeForStorage（リンク）", () => {
	it("本文に出てくるラベルのリンクだけを保存する（下準備・作り方・メモ・材料名）", () => {
		const document = createRecipeEditorDocument({
			name: "カレー丼",
			ingredientText: "[[ごはん]] 1杯",
			preparationText: "- [[カレー]]を温める",
			instructionText: "1. 盛る",
			note: "",
			links: [curry, rice, { label: "使っていない", targetPublicId: "x" }],
		});

		expect(prepareRecipeForStorage(document).links).toEqual([curry, rice]);
	});

	it("作り方とメモに出てくるラベルも、本文として扱う", () => {
		const document = createRecipeEditorDocument({
			name: "カレー丼",
			instructionText: "1. [[カレー]]をかける",
			note: "[[ごはん]]は、かために炊く",
			links: [curry, rice],
		});

		expect(prepareRecipeForStorage(document).links).toEqual([curry, rice]);
	});

	it("本文から消したラベルのリンクは、捨てる", () => {
		const document = createRecipeEditorDocument({
			name: "カレー丼",
			instructionText: "1. 盛る",
			links: [curry],
		});

		expect(prepareRecipeForStorage(document).links).toEqual([]);
	});

	it("リンクがなければ、空の一覧", () => {
		const document = createRecipeEditorDocument({ name: "卵焼き" });

		expect(prepareRecipeForStorage(document).links).toEqual([]);
	});
});

describe("prepareRecipeForStorage（作り置き）", () => {
	it("作り置きのスイッチを保存する。省略は、オフ", () => {
		const base = { name: "ドレッシング", instructionText: "1. 混ぜる" };

		expect(
			prepareRecipeForStorage(
				createRecipeEditorDocument({ ...base, stocksWhenMade: true }),
			).stocksWhenMade,
		).toBe(true);
		expect(
			prepareRecipeForStorage(createRecipeEditorDocument(base)).stocksWhenMade,
		).toBe(false);
	});
});
