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
						publicTags: ["main_dish", "quick"],
						personalTags: ["晩ご飯"],
					},
				}),
			],
			[
				buildBackupInventoryItem(),
				buildBackupInventoryItem({
					name: "鶏もも肉",
					art: [{ partId: "drumstick", x: 50, y: 50 }],
				}),
			],
			now,
			[{ name: "マイだし", aliases: ["うちのだし"], unmanaged: true }],
		);

		expect(parseBackupFile(serialize(file))).toEqual(file);
	});

	it("在庫の絵がない品目は、絵なし（名前から決める絵）として読む", () => {
		const file = createBackupFile([], [buildBackupInventoryItem()], now);
		const { art: _art, ...withoutArt } =
			file.inventory[0] ?? buildBackupInventoryItem();

		expect(
			parseBackupFile(serialize({ ...file, inventory: [withoutArt] }))
				.inventory[0]?.art,
		).toBeNull();
	});

	it("ロットの換算（1玉＝40g）は、書き出して読むと残る。ないロットは、換算なしとして読む", () => {
		const base = buildBackupInventoryItem();
		const lot = base.lots[0] ?? {
			quantity: 1,
			acquiredOn: "2026-10-30",
			storage: null,
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
			purchaseUnit: null,
		};
		const file = createBackupFile(
			[],
			[
				{
					...base,
					lots: [
						{
							...lot,
							purchaseUnit: {
								label: "玉",
								quantity: 40,
								quantityUnitLabel: "g",
							},
						},
					],
				},
			],
			now,
		);

		expect(parseBackupFile(serialize(file))).toEqual(file);

		const { purchaseUnit: _purchaseUnit, ...withoutUnit } = lot;

		expect(
			parseBackupFile(
				serialize({
					...file,
					inventory: [{ ...base, lots: [withoutUnit] }],
				}),
			).inventory[0]?.lots[0]?.purchaseUnit,
		).toBeNull();
	});

	it.each([
		["JSON でない", "{", "JSON ではありません"],
		[
			"別の形式",
			serialize({ format: "other" }),
			"在庫とレシピのファイルではありません",
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
									purchaseUnit: null,
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
