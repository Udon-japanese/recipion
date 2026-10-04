import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { daysBetween, type InventoryStorage } from "../domain/inventory-lot";

// 自分の過去の入力から、「買った日から期限まで、何日か」を覚えて、次の目安にする（この端末だけに保存する）。
// 食材ごとに、直近の5件。冷凍の入力は、冷蔵・常温の目安とは別なので、覚えない。
const storageKey = "recipion:expiry-hints";
const maxHintsPerIngredient = 5;

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;
type HintsByKey = Record<string, number[]>;

function getDefaultStorage(): KeyValueStorage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}

// 同じ食材の別名（「しょうゆ」「醤油」）を、同じキーにする。
function toKey(ingredientName: string): string {
	return (
		findIngredientCatalogEntry(ingredientName)?.id ??
		normalizeIngredientName(ingredientName)
	);
}

function readHints(storage: KeyValueStorage | null): HintsByKey {
	try {
		const raw = storage?.getItem(storageKey);
		const parsed: unknown = raw ? JSON.parse(raw) : {};

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return {};
		}

		const hints: HintsByKey = {};

		for (const [key, value] of Object.entries(parsed)) {
			if (Array.isArray(value)) {
				hints[key] = value.filter(
					(day): day is number =>
						typeof day === "number" && Number.isFinite(day),
				);
			}
		}

		return hints;
	} catch {
		return {};
	}
}

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
	storage: KeyValueStorage | null = getDefaultStorage(),
): void {
	if (input.storage === "freezer") {
		return;
	}

	const days = daysBetween(input.acquiredOn, input.expiresOn);

	if (!(days >= 0 && days <= 730)) {
		return;
	}

	try {
		const hints = readHints(storage);
		const key = toKey(input.ingredientName);

		hints[key] = [...(hints[key] ?? []), days].slice(-maxHintsPerIngredient);
		storage?.setItem(storageKey, JSON.stringify(hints));
	} catch {
		// 覚えられなくても、画面の操作は続ける。
	}
}

// 覚えた日数の中央値。覚えていなければ null。
export function getLearnedRemainingDays(
	ingredientName: string,
	storage: KeyValueStorage | null = getDefaultStorage(),
): number | null {
	const days = readHints(storage)[toKey(ingredientName)];

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
