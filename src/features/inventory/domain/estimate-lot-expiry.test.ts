import { describe, expect, it } from "vitest";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import {
	type EstimateLotExpiryInput,
	estimateLotExpiry,
} from "./estimate-lot-expiry";

const acquiredOn = "2026-10-05";

function estimate(
	name: string,
	overrides: Partial<EstimateLotExpiryInput> = {},
) {
	const entry = findIngredientCatalogEntry(name);

	if (!entry) {
		throw new Error(`カタログにありません: ${name}`);
	}

	return estimateLotExpiry({
		expiry: entry.expiry,
		acquiredOn,
		storage: null,
		userExpiryKind: null,
		learnedRemainingDays: null,
		level: "reliable",
		...overrides,
	});
}

describe("estimateLotExpiry", () => {
	it("オフのときは、何も付けない", () => {
		expect(estimate("玉ねぎ", { level: "off" })).toBeNull();
	});

	it("印字のない食材（生野菜）は、保存方法ごとの日数で、買った日から数える", () => {
		// 玉ねぎ：常温14日
		expect(estimate("玉ねぎ")).toEqual({
			expiresOn: "2026-10-19",
			expiryKind: "none",
			basis: "shelf-life",
			reliability: "reliable",
		});
		// 冷蔵に変えると、21日
		expect(estimate("玉ねぎ", { storage: "fridge" })?.expiresOn).toBe(
			"2026-10-26",
		);
	});

	it("冷凍は、冷凍の日数で、買った日から数える（冷凍野菜は約90日）", () => {
		expect(estimate("冷凍ブロッコリー")).toEqual({
			expiresOn: "2027-01-03",
			expiryKind: "best-before",
			basis: "shelf-life",
			reliability: "reliable",
		});
		// 冷蔵の食材でも、冷凍に保存方法を変えれば、冷凍の日数
		expect(estimate("鶏もも肉", { storage: "freezer" })?.expiresOn).toBe(
			"2026-11-04",
		);
	});

	it("印字のある傷みやすい食材は、「確実なものだけ」では目安を付けない。「すべて」では、一般的な残り日数（短め）", () => {
		expect(estimate("鶏もも肉")).toBeNull();
		expect(estimate("鶏もも肉", { level: "all" })).toEqual({
			expiresOn: "2026-10-07",
			expiryKind: "use-by",
			basis: "typical-remaining",
			reliability: "uncertain",
		});
	});

	it("常温の保存食（賞味期限が90日以上）は、「確実なものだけ」でも、目安を付ける", () => {
		expect(estimate("醤油")).toMatchObject({
			expiresOn: "2027-04-03",
			expiryKind: "best-before",
			basis: "typical-remaining",
			reliability: "reliable",
		});
	});

	it("期限の表示を省略できる食材（塩・砂糖）は、目安を付けない", () => {
		expect(estimate("塩", { level: "all" })).toBeNull();
	});

	it("自分の過去の入力があれば、それを使う（傷みやすい食材でも、「確実なものだけ」で）", () => {
		expect(estimate("鶏もも肉", { learnedRemainingDays: 4 })).toEqual({
			expiresOn: "2026-10-09",
			expiryKind: "use-by",
			basis: "learned",
			reliability: "reliable",
		});
	});

	it("過去の入力は、冷凍には使わない", () => {
		expect(
			estimate("鶏もも肉", { storage: "freezer", learnedRemainingDays: 4 })
				?.basis,
		).toBe("shelf-life");
	});

	it("ユーザーが決めた期限の種類を、優先する", () => {
		expect(
			estimate("牛乳", { level: "all", userExpiryKind: "best-before" })
				?.expiryKind,
		).toBe("best-before");
	});

	it("カタログにない食材は、過去の入力だけで目安を付ける", () => {
		expect(
			estimateLotExpiry({
				expiry: undefined,
				acquiredOn,
				storage: null,
				userExpiryKind: null,
				learnedRemainingDays: 5,
				level: "reliable",
			}),
		).toMatchObject({ expiresOn: "2026-10-10", basis: "learned" });
		expect(
			estimateLotExpiry({
				expiry: undefined,
				acquiredOn,
				storage: null,
				userExpiryKind: null,
				learnedRemainingDays: null,
				level: "all",
			}),
		).toBeNull();
	});
});
