import type { IngredientExpiryInfo } from "#/features/ingredients/domain/ingredient-catalog";
import {
	addDays,
	type InventoryExpiryKind,
	type InventoryStorage,
} from "./inventory-lot";

// 期限の目安の自動入力：オフ／確実なものだけ（初期値）／すべて。
export type ExpiryEstimateLevel = "off" | "reliable" | "all";

// 常温で、賞味期限が、これ以上先まで残っているのが一般的な保存食は、「買った日 ＋ 日数」で、確実なものとして扱う。
const LONG_LIFE_PANTRY_DAYS = 90;

export type EstimatedExpiry = {
	expiresOn: string;
	expiryKind: InventoryExpiryKind;
	// 目安の根拠：shelf-life 保存方法ごとの日数 / typical-remaining 買った時点で一般的な残り日数 / learned 自分の過去の入力。
	basis: "shelf-life" | "typical-remaining" | "learned";
	// reliable: 買った日からの計算で、ずれが小さい。uncertain: 印字の日付がある食材（実物の日付とずれやすい）。
	reliability: "reliable" | "uncertain";
};

export type EstimateLotExpiryInput = {
	// カタログの期限の目安（ない食材は、undefined）。
	expiry: IngredientExpiryInfo | undefined;
	// 買った日（YYYY-MM-DD）。
	acquiredOn: string;
	// ロットの保存方法（空は、食材の初期値に従う）。
	storage: InventoryStorage | null;
	// ユーザーが決めた、この食材の期限の種類（空は、カタログに従う）。
	userExpiryKind: InventoryExpiryKind | null;
	// ユーザー自身の、過去の入力から求めた、買った日から期限までの日数（ない場合は null）。
	learnedRemainingDays: number | null;
	level: ExpiryEstimateLevel;
};

/**
 * 買った日から、期限の目安を出す。目安を付けないときは null。
 *
 * - 冷凍：冷凍の保存日数（短め）。
 * - 印字のない食材（生野菜など）：保存方法ごとの日数。
 * - 印字のある食材：買った日から数えるのは、ずれやすい。自分の過去の入力があれば、それを使う。
 *   なければ、常温の保存食（賞味期限が90日以上）は、確実なものとして扱い、傷みやすい食品は、「すべて」のときだけ、
 *   買った時点の一般的な残り日数（短め）を使う。
 */
export function estimateLotExpiry(
	input: EstimateLotExpiryInput,
): EstimatedExpiry | null {
	if (input.level === "off") {
		return null;
	}

	const storage = input.storage ?? input.expiry?.defaultStorage ?? null;
	const kind = input.userExpiryKind ?? input.expiry?.kind ?? null;

	const estimate = (
		days: number,
		basis: EstimatedExpiry["basis"],
		reliability: EstimatedExpiry["reliability"],
	): EstimatedExpiry | null => {
		if (input.level === "reliable" && reliability !== "reliable") {
			return null;
		}

		return {
			expiresOn: addDays(input.acquiredOn, days),
			expiryKind: kind ?? "none",
			basis,
			reliability,
		};
	};

	// 自分の過去の入力（冷凍以外）。個人の買い方に合っているため、確実なものとして扱う。
	if (input.learnedRemainingDays !== null && storage !== "freezer") {
		return estimate(input.learnedRemainingDays, "learned", "reliable");
	}

	if (!input.expiry || storage === null) {
		return null;
	}

	if (storage === "freezer") {
		const days = input.expiry.shelfLifeDays.freezer;

		return days === undefined ? null : estimate(days, "shelf-life", "reliable");
	}

	if (!input.expiry.hasPrintedDate) {
		const days = input.expiry.shelfLifeDays[storage];

		return days === undefined ? null : estimate(days, "shelf-life", "reliable");
	}

	const remaining = input.expiry.typicalRemainingDays;

	if (remaining === null) {
		return null;
	}

	const isLongLifePantry =
		kind === "best-before" &&
		storage === "room" &&
		remaining >= LONG_LIFE_PANTRY_DAYS;

	return estimate(
		remaining,
		"typical-remaining",
		isLongLifePantry ? "reliable" : "uncertain",
	);
}
