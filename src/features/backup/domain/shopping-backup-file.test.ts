import { describe, expect, it } from "vitest";
import { buildShoppingData } from "#/test/builders/build-shopping-backup";
import {
	createShoppingBackupFile,
	formatShoppingBackupFileName,
	parseShoppingBackupFile,
	type ShoppingBackupFile,
} from "./shopping-backup-file";

const now = new Date("2026-11-01T03:00:00.000Z");

function createFile(): ShoppingBackupFile {
	return createShoppingBackupFile(buildShoppingData(), now);
}

describe("createShoppingBackupFile", () => {
	it("購入済みの項目は入れず、ほかの表はそのまま入れる", () => {
		const file = createFile();

		expect(file.items.map((item) => item.id)).toEqual([
			"item-egg",
			"item-mince",
		]);
		expect(file.stores).toHaveLength(1);
		expect(file.branches).toHaveLength(1);
		expect(file.storeDefaults).toHaveLength(1);
		expect(file.conversionMemories).toHaveLength(1);
	});
});

describe("parseShoppingBackupFile", () => {
	it("書き出したファイルを読むと、同じ内容に戻る", () => {
		const file = createFile();

		expect(parseShoppingBackupFile(JSON.stringify(file))).toEqual(file);
	});

	it.each<{
		title: string;
		change: (file: ShoppingBackupFile) => unknown;
		message: string;
	}>([
		{
			title: "在庫とレシピのバックアップ",
			change: (file) => ({ ...file, format: "recipion-backup" }),
			message: "買い物メモのファイルではありません",
		},
		{
			title: "違う版",
			change: (file) => ({ ...file, version: 2 }),
			message: "この版のファイルは読めません（版 2）",
		},
		{
			title: "購入済みの項目",
			change: (file) => ({
				...file,
				items: file.items.map((item) => ({ ...item, status: "purchased" })),
			}),
			message: "ファイルの形が正しくありません",
		},
		{
			title: "21件目の店",
			change: (file) => ({
				...file,
				stores: Array.from({ length: 21 }, (_, index) => ({
					...file.stores[0],
					id: `store-${index}`,
				})),
			}),
			message: "ファイルの形が正しくありません",
		},
		{
			title: "重なった項目の ID",
			change: (file) => ({
				...file,
				items: file.items.map((item) => ({ ...item, id: "same" })),
			}),
			message: "ファイルの中で、ID が重複しています",
		},
		{
			title: "ない店を指す項目",
			change: (file) => ({ ...file, stores: [], storeDefaults: [] }),
			message: "「卵」の店が、ファイルの中にありません",
		},
		{
			title: "条件つきメモの側だけがある項目",
			change: (file) => ({
				...file,
				items: file.items.map((item) => ({ ...item, branchId: null })),
			}),
			message: "「合い挽き肉」の条件つきメモの形が正しくありません",
		},
		{
			title: "ない条件つきメモを指す項目",
			change: (file) => ({ ...file, branches: [] }),
			message: "「合い挽き肉」の条件つきメモが、ファイルの中にありません",
		},
		{
			title: "ない店を指す、いつも買う店",
			change: (file) => ({
				...file,
				storeDefaults: [{ nameKey: "牛乳", storeId: "missing" }],
			}),
			message: "いつも買う店が、ファイルの中にありません",
		},
	])("$title は読まない", ({ change, message }) => {
		expect(() =>
			parseShoppingBackupFile(JSON.stringify(change(createFile()))),
		).toThrow(message);
	});

	it("JSON でないファイルは読まない", () => {
		expect(() => parseShoppingBackupFile("{")).toThrow(
			"ファイルを読めませんでした（JSON ではありません）",
		);
	});
});

describe("formatShoppingBackupFileName", () => {
	it("日本時間の日付をつける", () => {
		expect(
			formatShoppingBackupFileName(new Date("2026-11-01T15:30:00.000Z")),
		).toBe("recipion-shopping-2026-11-02.json");
	});
});
