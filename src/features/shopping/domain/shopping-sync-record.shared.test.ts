import { describe, expect, it } from "vitest";
import { records } from "../../../../shared-data/test-cases/shopping-sync-records.json";
import { parseShoppingSyncRecord } from "./shopping-sync-record";

// アプリ（Kotlin）も同じ行を読み、書き戻した形が同じになることを確かめる（null の欄・省く欄の扱いを合わせる）。
describe("同期の行の形（共通のテストデータ）", () => {
	it.each(records)("$kind $id", ({ version: _version, ...record }) => {
		expect(parseShoppingSyncRecord(record)).toEqual(record);
	});
});
