import { describe, expect, it } from "vitest";
import { findRecipeTipSlots } from "./find-recipe-tip-slots";

describe("findRecipeTipSlots", () => {
	it("中身が空の見出しの、次の行の先頭を返す", () => {
		const text = "＜下準備＞\n\n＜材料＞\n\n＜作り方＞\n\n＜メモ＞\n";

		expect(findRecipeTipSlots(text)).toEqual([
			{ kind: "preparations", offset: 6 },
			{ kind: "ingredients", offset: 12 },
			{ kind: "instructions", offset: 19 },
			{ kind: "note", offset: 25 },
		]);
	});

	it("何か書かれた見出しには出さない", () => {
		const text = "＜下準備＞\n玉ねぎを切る\n\n＜材料＞\n\n＜作り方＞";

		expect(findRecipeTipSlots(text).map((slot) => slot.kind)).toEqual([
			"ingredients",
		]);
	});

	it("見出しの次の行がなければ、出さない。見出しがなければ、何も出さない", () => {
		expect(findRecipeTipSlots("＜材料＞")).toEqual([]);
		expect(findRecipeTipSlots("卵 1個")).toEqual([]);
		expect(findRecipeTipSlots("")).toEqual([]);
	});

	it("飾りの違う見出しも、見出しとして扱う", () => {
		expect(
			findRecipeTipSlots("【材料（2人分）】\n").map((s) => s.kind),
		).toEqual(["ingredients"]);
	});
});
