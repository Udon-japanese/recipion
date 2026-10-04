import { describe, expect, it } from "vitest";
import {
	buildExpiryPrefill,
	emptyExpiryFields,
	findInventoryItemByName,
} from "./build-expiry-prefill";

const base = {
	acquiredOn: "2026-10-05",
	level: "reliable" as const,
	learnedRemainingDays: null,
	userDefaults: null,
};

describe("buildExpiryPrefill", () => {
	it("目安を付けられる食材は、日付と種類を入れ、出所を estimated にする", () => {
		expect(
			buildExpiryPrefill({ ...base, ingredientName: "冷凍ブロッコリー" }),
		).toEqual({
			expiresOn: "2027-01-03",
			expiryKind: "best-before",
			storage: "",
			expirySource: "estimated",
		});
	});

	it("印字のある傷みやすい食材は、日付は空で、期限の種類だけ入れる", () => {
		expect(buildExpiryPrefill({ ...base, ingredientName: "鶏もも肉" })).toEqual(
			{
				expiresOn: "",
				expiryKind: "use-by",
				storage: "",
				expirySource: "",
			},
		);
	});

	it("オフなら、日付は空（種類の初期値は入れる）", () => {
		expect(
			buildExpiryPrefill({ ...base, ingredientName: "玉ねぎ", level: "off" }),
		).toMatchObject({ expiresOn: "", expirySource: "" });
	});

	it("ユーザーが決めた期限の種類と保存方法を、優先する", () => {
		expect(
			buildExpiryPrefill({
				...base,
				ingredientName: "玉ねぎ",
				userDefaults: { expiryKind: "best-before", storage: "fridge" },
			}),
		).toMatchObject({
			// 冷蔵なので21日（常温なら14日）
			expiresOn: "2026-10-26",
			expiryKind: "best-before",
			expirySource: "estimated",
		});
	});

	it("カタログにない食材は、過去の入力があるときだけ、日付を入れる", () => {
		expect(buildExpiryPrefill({ ...base, ingredientName: "謎の食材" })).toEqual(
			emptyExpiryFields,
		);
		expect(
			buildExpiryPrefill({
				...base,
				ingredientName: "謎の食材",
				learnedRemainingDays: 5,
			}),
		).toMatchObject({ expiresOn: "2026-10-10", expirySource: "estimated" });
	});
});

describe("findInventoryItemByName", () => {
	const items = [{ name: "醤油" }, { name: "ミニ トマト" }];

	it("別名でも、同じ食材を見つける", () => {
		expect(findInventoryItemByName(items, "しょうゆ")).toBe(items[0]);
	});

	it("カタログにない食材は、正規化した名前で探す", () => {
		expect(findInventoryItemByName(items, "ミニ　トマト")).toBe(items[1]);
		expect(findInventoryItemByName(items, "牛乳")).toBeUndefined();
	});
});
