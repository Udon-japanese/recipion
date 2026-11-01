import { describe, expect, it } from "vitest";
import { buildBackupRecipe } from "#/test/builders/build-backup";
import {
	decideRecipeImport,
	prepareRecipeImportDocument,
	remapRecipeLinks,
} from "./plan-recipe-import";

describe("decideRecipeImport", () => {
	it.each([
		["自分が持っている", "self", { action: "skip", publicId: "abc" }],
		["空いている", null, { action: "create", publicId: "abc" }],
		["他の人が使っている", "other", { action: "create", publicId: null }],
	] as const)("%s", (_, owner, expected) => {
		expect(decideRecipeImport("abc", owner)).toEqual(expected);
	});
});

describe("prepareRecipeImportDocument", () => {
	it("ID を作り直し、前の工程への参照も付け替え、非公開・リンクなしにする", () => {
		const { content } = buildBackupRecipe({
			content: {
				visibility: "public",
				links: [{ label: "だし", targetPublicId: "dashi" }],
			},
		});
		const [first, second] = content.instructions;

		if (!first || !second) {
			throw new Error("工程が2つ必要です");
		}

		let sequence = 0;
		const prepared = prepareRecipeImportDocument(
			{
				...content,
				instructions: [
					first,
					{ ...second, referencedInstructionIds: [first.id] },
				],
			},
			() => {
				sequence += 1;

				return `new-${sequence}`;
			},
		);
		const oldIds = new Set([
			...content.ingredients.map((node) => node.id),
			...content.instructions.map((instruction) => instruction.id),
		]);

		expect(prepared.ingredients.every((node) => !oldIds.has(node.id))).toBe(
			true,
		);
		expect(prepared.instructions[1]?.referencedInstructionIds).toEqual([
			prepared.instructions[0]?.id,
		]);
		expect(prepared.visibility).toBe("private");
		expect(prepared.links).toEqual([]);
		expect(
			prepared.instructions.map((instruction) => instruction.text),
		).toEqual(content.instructions.map((instruction) => instruction.text));
	});
});

describe("remapRecipeLinks", () => {
	it("ファイルの中のレシピは新しい公開 ID に、ファイルにないレシピはそのまま", () => {
		expect(
			remapRecipeLinks(
				[
					{ label: "だし", targetPublicId: "dashi" },
					{ label: "山田さんのたれ", targetPublicId: "others" },
				],
				new Map([["dashi", "dashi-new"]]),
			),
		).toEqual([
			{ label: "だし", targetPublicId: "dashi-new" },
			{ label: "山田さんのたれ", targetPublicId: "others" },
		]);
	});
});
