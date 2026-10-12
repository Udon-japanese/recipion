import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { storageKeys } from "#/local-storage/keys";
import {
	defineStorageItem,
	type KeyValueStorage,
} from "#/local-storage/storage-item";
import { daysBetween, type InventoryStorage } from "../domain/inventory-lot";

// 自分の過去の入力から、「買った日から期限まで、何日か」を覚えて、次の目安にする（この端末だけに保存する）。
// 食材ごとに、直近の5件。冷凍の入力は、冷蔵・常温の目安とは別なので、覚えない。
const maxHintsPerIngredient = 5;

type HintsByKey = Record<string, number[]>;

// 同じ食材の別名（「しょうゆ」「醤油」）を、同じキーにする。
function toKey(ingredientName: string): string {
	return (
		findIngredientCatalogEntry(ingredientName)?.id ??
		normalizeIngredientName(ingredientName)
	);
}

// 保存された文字列を、日数の一覧にする。形が違う項目は、捨てる（数値以外の日数も、捨てる）。
function parseHints(raw: string): HintsByKey | undefined {
	const parsed: unknown = JSON.parse(raw);

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return undefined;
	}

	const hints: HintsByKey = {};

	for (const [key, value] of Object.entries(parsed)) {
		if (Array.isArray(value)) {
			hints[key] = value.filter(
				(day): day is number => typeof day === "number" && Number.isFinite(day),
			);
		}
	}

	return hints;
}

export const expiryHintsItem = defineStorageItem<HintsByKey>({
	key: storageKeys.expiryHints,
	defaultValue: {},
	parse: parseHints,
	serialize: (hints) => JSON.stringify(hints),
});

/**
 * ユーザーが入力した期限を、覚える。目安（自動入力）は、覚えない（呼び出し側で、入力のときだけ呼ぶ）。
 * 買った日より前の日付や、2年より先の日付は、入力ミスとみなして、覚えない。
 */
export function recordExpiryHint(
	input: {
		ingredientName: string;
		acquiredOn: string;
		expiresOn: string;
		storage: InventoryStorage | null;
	},
	storage?: KeyValueStorage | null,
): void {
	if (input.storage === "freezer") {
		return;
	}

	const days = daysBetween(input.acquiredOn, input.expiresOn);

	if (!(days >= 0 && days <= 730)) {
		return;
	}

	// 既定値は共有されるので、コピーしてから書き換える。
	const hints = { ...expiryHintsItem.read(storage) };
	const key = toKey(input.ingredientName);

	hints[key] = [...(hints[key] ?? []), days].slice(-maxHintsPerIngredient);
	// 覚えられなくても、画面の操作は続ける（書けない環境では、このタブの間だけ覚える）。
	expiryHintsItem.write(hints, storage);
}

// 覚えた日数の中央値。覚えていなければ null。
export function getLearnedRemainingDays(
	ingredientName: string,
	storage?: KeyValueStorage | null,
): number | null {
	const days = expiryHintsItem.read(storage)[toKey(ingredientName)];

	if (!days || days.length === 0) {
		return null;
	}

	const sorted = [...days].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 === 1
			? (sorted[middle] ?? 0)
			: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;

	return Math.round(median);
}
