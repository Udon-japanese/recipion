import { describe, expect, it } from "vitest";
import {
	buildBackupInventoryItem,
	buildBackupRecipe,
} from "#/test/builders/build-backup";
import {
	createBackupFile,
	formatBackupFileName,
	parseBackupFile,
} from "./backup-file";

const now = new Date("2026-11-01T03:00:00.000Z");

function serialize(value: unknown): string {
	return JSON.stringify(value);
}

describe("parseBackupFile", () => {
	it("書き出したファイルを読むと、同じ内容に戻る", () => {
		const file = createBackupFile(
			[
				buildBackupRecipe({
					content: {
						links: [{ label: "だし", targetPublicId: "dashi" }],
						cover: [{ partId: "rice", x: 50, y: 50 }],
						stocksWhenMade: true,
						visibility: "public",
					},
				}),
			],
			[buildBackupInventoryItem()],
			now,
			[{ name: "マイだし", aliases: ["うちのだし"], unmanaged: true }],
		);

		expect(parseBackupFile(serialize(file))).toEqual(file);
	});

	it.each([
		["JSON でない", "{", "JSON ではありません"],
		[
			"別の形式",
			serialize({ format: "other" }),
			"recipion で書き出したファイルではありません",
		],
		[
			"違う版",
			serialize({ ...createBackupFile([], [], now), version: 2 }),
			"この版のファイルは読めません（版 2）",
		],
		[
			"在庫の日付が存在しない",
			serialize(
				createBackupFile(
					[],
					[
						buildBackupInventoryItem({
							lots: [
								{
									quantity: 1,
									acquiredOn: "2026-02-30",
									storage: null,
									expiresOn: null,
									expiryKind: null,
									expirySource: null,
								},
							],
						}),
					],
					now,
				),
			),
			"在庫の形が正しくありません",
		],
		[
			"レシピの ID が重複",
			serialize(
				createBackupFile([buildBackupRecipe(), buildBackupRecipe()], [], now),
			),
			"レシピの ID が重複しています",
		],
		[
			"材料の形が正しくない",
			serialize({
				...createBackupFile([], [], now),
				dictionary: [{ name: "", aliases: [], unmanaged: false }],
			}),
			"ファイルの材料の形が正しくありません",
		],
		[
			"レシピが上限を超える（どのレシピかを示す）",
			serialize(
				createBackupFile(
					[buildBackupRecipe({ content: { note: "あ".repeat(3001) } })],
					[],
					now,
				),
			),
			"レシピ「肉じゃが」：",
		],
	])("%s：読まずに、理由を伝える", (_, text, message) => {
		expect(() => parseBackupFile(text)).toThrow(message);
	});
});

describe("formatBackupFileName", () => {
	it("日本時間の日付をつける", () => {
		expect(formatBackupFileName(new Date("2026-10-31T15:30:00.000Z"))).toBe(
			"recipion-backup-2026-11-01.json",
		);
	});
});
