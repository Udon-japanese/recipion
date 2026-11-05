import { describe, expect, it } from "vitest";
import { buildBackupRecipe } from "#/test/builders/build-backup";
import {
	decideRecipeImport,
	deriveImportPublicId,
	prepareRecipeImportDocument,
	remapRecipeLinks,
} from "./plan-recipe-import";

describe("decideRecipeImport", () => {
	it.each([
		["自分が持っている", "self", null, { action: "skip", publicId: "abc" }],
		["空いている", null, null, { action: "create", publicId: "abc" }],
		[
			"他の人が使っている・代わりの ID が空いている",
			"other",
			null,
			{ action: "create", publicId: "derived" },
		],
		[
			"他の人が使っている・代わりの ID を自分が持っている（やり直し）",
			"other",
			"self",
			{ action: "skip", publicId: "derived" },
		],
		[
			"他の人が使っている・代わりの ID も他の人",
			"other",
			"other",
			{ action: "create", publicId: null },
		],
	] as const)("%s", (_, owner, derivedOwner, expected) => {
		expect(
			decideRecipeImport("abc", owner, {
				publicId: "derived",
				owner: derivedOwner,
			}),
		).toEqual(expected);
	});
});

describe("deriveImportPublicId", () => {
	it("同じユーザーとファイルの ID なら、いつも同じ。どちらかが違えば、違う", async () => {
		const first = await deriveImportPublicId("user-a", "abc");

		expect(first).toMatch(/^[\w-]{21}$/u);
		await expect(deriveImportPublicId("user-a", "abc")).resolves.toBe(first);
		await expect(deriveImportPublicId("user-b", "abc")).resolves.not.toBe(
			first,
		);
		await expect(deriveImportPublicId("user-a", "abd")).resolves.not.toBe(
			first,
		);
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
