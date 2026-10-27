import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import {
	type ExpiryEstimateLevel,
	estimateLotExpiry,
} from "./estimate-lot-expiry";
import type { InventoryExpiryKind, InventoryStorage } from "./inventory-lot";

// 期限の入力欄の値（日付の空は、入力なし）。
export type ExpiryFieldsValue = {
	expiresOn: string;
	expiryKind: InventoryExpiryKind | "";
	storage: InventoryStorage | "";
	// 日付の出所。estimated は、自動の目安（「約」と表示する）。ユーザーが日付を直すと entered になる。
	expirySource: "entered" | "estimated" | "";
};

export const emptyExpiryFields: ExpiryFieldsValue = {
	expiresOn: "",
	expiryKind: "",
	storage: "",
	expirySource: "",
};

// ユーザーが決めた、この食材の期限の種類と初期の保存方法。
export type IngredientExpiryDefaults = {
	expiryKind: InventoryExpiryKind | null;
	storage: InventoryStorage | null;
};

export type BuildExpiryPrefillInput = {
	ingredientName: string;
	// 買った日（YYYY-MM-DD）。
	acquiredOn: string;
	level: ExpiryEstimateLevel;
	// 自分の過去の入力から求めた日数（ない場合は null）。
	learnedRemainingDays: number | null;
	userDefaults: IngredientExpiryDefaults | null;
};

/**
 * 入力欄の初期値を作る。期限の種類は、ユーザーが決めたもの、なければカタログの一般的な種類を入れる
 * （日付だけ入れればよいようにする）。日付は、目安を付けられるときだけ入れ、出所は estimated にする。
 * 保存方法の欄は、空のまま（食材の初期値に従う）。
 */
export function buildExpiryPrefill(
	input: BuildExpiryPrefillInput,
): ExpiryFieldsValue {
	const entry = findIngredientCatalogEntry(input.ingredientName);
	const kind = input.userDefaults?.expiryKind ?? entry?.expiry?.kind ?? null;

	const estimated = estimateLotExpiry({
		expiry: entry?.expiry,
		acquiredOn: input.acquiredOn,
		storage: input.userDefaults?.storage ?? null,
		userExpiryKind: input.userDefaults?.expiryKind ?? null,
		learnedRemainingDays: input.learnedRemainingDays,
		level: input.level,
	});

	return {
		expiresOn: estimated?.expiresOn ?? "",
		expiryKind: estimated?.expiryKind ?? kind ?? "",
		storage: "",
		expirySource: estimated ? "estimated" : "",
	};
}

// 在庫の食材の一覧から、名前（別名を含む）が同じ食材を探す。
// 「作った」で入れたできあがり（作り置き）は、同じ名前の材料とは別物なので、探さない。
export function findInventoryItemByName<
	T extends { name: string; sourceRecipePublicId?: string },
>(items: readonly T[], ingredientName: string): T | undefined {
	const catalogId = findIngredientCatalogEntry(ingredientName)?.id;
	const normalizedName = normalizeIngredientName(ingredientName);

	return items.find((item) => {
		if (item.sourceRecipePublicId !== undefined) {
			return false;
		}

		const itemCatalogId = findIngredientCatalogEntry(item.name)?.id;

		return catalogId !== undefined && itemCatalogId !== undefined
			? catalogId === itemCatalogId
			: normalizeIngredientName(item.name) === normalizedName;
	});
}
