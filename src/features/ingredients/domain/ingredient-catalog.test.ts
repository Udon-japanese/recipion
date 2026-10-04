import { describe, expect, it } from "vitest";
import { inventoryUnitCodes } from "#/features/inventory/domain/inventory-unit";
import {
	findIngredientCatalogEntry,
	ingredientCatalogEntries,
	searchIngredientCatalog,
} from "./ingredient-catalog";
import { ingredientExpiryById } from "./ingredient-catalog-data/expiry";
import { normalizeIngredientName } from "./normalize-ingredient-name";

describe("食材のカタログのデータ", () => {
	it("IDは重複しない", () => {
		const ids = ingredientCatalogEntries.map((entry) => entry.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it("名前と別名は、正規化したあとも、食材をまたいで重複しない", () => {
		const owners = new Map<string, string>();
		const duplicates: string[] = [];

		for (const entry of ingredientCatalogEntries) {
			for (const alias of new Set([entry.name, ...entry.aliases])) {
				const normalizedAlias = normalizeIngredientName(alias);
				const owner = owners.get(normalizedAlias);

				if (owner !== undefined && owner !== entry.id) {
					duplicates.push(`${alias}（${owner} と ${entry.id}）`);
				}

				owners.set(normalizedAlias, entry.id);
			}
		}

		expect(duplicates).toEqual([]);
	});

	it("重さと密度は、正の有限の数である", () => {
		for (const entry of ingredientCatalogEntries) {
			for (const weight of entry.unitWeights ?? []) {
				expect(Number.isFinite(weight.grams) && weight.grams > 0).toBe(true);
			}

			if (entry.density) {
				expect(
					Number.isFinite(entry.density.gramsPerMl) &&
						entry.density.gramsPerMl > 0,
				).toBe(true);
			}
		}
	});
});

describe("findIngredientCatalogEntry", () => {
	it("別名・全角半角・大文字小文字の違いを吸収して見つける", () => {
		expect(findIngredientCatalogEntry("しょうゆ")?.id).toBe("soy-sauce");
		expect(findIngredientCatalogEntry("  たまねぎ ")?.id).toBe("onion");
		expect(findIngredientCatalogEntry("ホケミ")?.id).toBe("hotcake-mix");
		expect(findIngredientCatalogEntry("ポテト（じゃがいも）")?.id).toBe(
			"potato",
		);
	});

	it("カタログにない名前と空文字は、undefined", () => {
		expect(findIngredientCatalogEntry("謎の食材")).toBeUndefined();
		expect(findIngredientCatalogEntry("  ")).toBeUndefined();
	});
});

describe("買うときの数量プリセット", () => {
	const entriesWithPresets = ingredientCatalogEntries.filter(
		(entry) => (entry.presets?.length ?? 0) > 0,
	);

	it("卵・牛乳・ホットケーキミックスに、プリセットがある", () => {
		expect(entriesWithPresets.map((entry) => entry.id)).toEqual(
			expect.arrayContaining(["egg", "milk", "hotcake-mix"]),
		);
	});

	it("プリセットは、有効な値で、食材の在庫の単位と管理方法に合っている", () => {
		for (const entry of entriesWithPresets) {
			for (const preset of entry.presets ?? []) {
				expect(preset.label.length).toBeGreaterThan(0);
				expect(preset.quantity).toBeGreaterThan(0);
				expect(preset.unitLabel.length).toBeGreaterThan(0);
				expect(inventoryUnitCodes).toContain(
					preset.inventoryConversion.stockUnitCode,
				);
				expect(preset.inventoryConversion.stockUnitCode).toBe(
					entry.stockUnitCode,
				);
				expect(preset.inventoryConversion.trackingMode).toBe(
					entry.defaultTrackingMode,
				);
				expect(
					preset.inventoryConversion.stockQuantityPerInputUnit,
				).toBeGreaterThan(0);
			}
		}
	});
});

describe("searchIngredientCatalog", () => {
	it("前方一致、部分一致の順で返し、完全一致を先頭にする", () => {
		const names = searchIngredientCatalog("塩").map((entry) => entry.name);

		expect(names[0]).toBe("塩");
		expect(names).toContain("塩胡椒");
	});

	it("ひらがな・カタカナの違いと、全角半角を吸収する", () => {
		expect(searchIngredientCatalog("しょうゆ")[0]?.id).toBe("soy-sauce");
		expect(searchIngredientCatalog("ショウユ")[0]?.id).toBe("soy-sauce");
		expect(searchIngredientCatalog("たまご")[0]?.id).toBe("egg");
		expect(searchIngredientCatalog("ＭＩＬＫ")[0]?.id).toBe("milk");
	});

	it("別名で見つけても、食材は1回だけ返す", () => {
		const ids = searchIngredientCatalog("ねぎ").map((entry) => entry.id);

		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toContain("long-onion");
	});

	it("件数を制限し、空文字・合わない文字は空にする", () => {
		expect(searchIngredientCatalog("ー", 3).length).toBeLessThanOrEqual(3);
		expect(searchIngredientCatalog("   ")).toEqual([]);
		expect(searchIngredientCatalog("ドラゴンフルーツ")).toEqual([]);
	});
});

describe("期限の目安のデータ", () => {
	it("すべての食材に、期限の目安がある", () => {
		const missing = ingredientCatalogEntries
			.filter((entry) => entry.expiry === undefined)
			.map((entry) => entry.id);

		expect(missing).toEqual([]);
	});

	it("日数は、1〜730の整数である", () => {
		const invalid: string[] = [];

		for (const entry of ingredientCatalogEntries) {
			const days = [
				entry.expiry?.typicalRemainingDays,
				entry.expiry?.shelfLifeDays.room,
				entry.expiry?.shelfLifeDays.fridge,
				entry.expiry?.shelfLifeDays.freezer,
			];

			for (const value of days) {
				if (
					value !== undefined &&
					value !== null &&
					!(Number.isInteger(value) && value >= 1 && value <= 730)
				) {
					invalid.push(`${entry.id}: ${value}`);
				}
			}
		}

		expect(invalid).toEqual([]);
	});

	it("初期の保存方法が冷凍の食材は、冷凍の日数を持つ", () => {
		const missing = ingredientCatalogEntries
			.filter(
				(entry) =>
					entry.expiry?.defaultStorage === "freezer" &&
					entry.expiry.shelfLifeDays.freezer === undefined,
			)
			.map((entry) => entry.id);

		expect(missing).toEqual([]);
	});

	it("印字のない食材は、初期の保存方法の日数を持つか、期限の目安を付けない種類（none）である", () => {
		const invalid = ingredientCatalogEntries
			.filter(
				(entry) =>
					entry.expiry &&
					!entry.expiry.hasPrintedDate &&
					entry.expiry.kind !== "none",
			)
			.map((entry) => entry.id);

		expect(invalid).toEqual([]);
	});

	it("印字のある食材の、買った時点の残り日数は、冷蔵・常温の食材に、すべてある（冷凍の食材を除く）", () => {
		const missing = ingredientCatalogEntries
			.filter(
				(entry) =>
					entry.expiry?.hasPrintedDate &&
					entry.expiry.defaultStorage !== "freezer" &&
					entry.expiry.typicalRemainingDays === null,
			)
			.map((entry) => entry.id);

		expect(missing).toEqual([]);
	});

	it("全食材の件数が、期限のデータに余りも不足もない", () => {
		// 期限のデータにあって、カタログにない ID（食材の名前を変えたときの取りこぼし）を検出する。
		const ids = new Set(ingredientCatalogEntries.map((entry) => entry.id));
		const orphaned = Object.keys(ingredientExpiryById).filter(
			(id) => !ids.has(id),
		);

		expect(orphaned).toEqual([]);
	});
});
