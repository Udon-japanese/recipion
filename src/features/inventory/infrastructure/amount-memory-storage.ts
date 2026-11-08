import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { storageKeys } from "#/local-storage/keys";
import {
	defineStorageItem,
	type KeyValueStorage,
} from "#/local-storage/storage-item";

// 「使った」「買い足した」で打った量を、食材と単位ごとに覚えて、量の欄のチップに出す（この端末だけに保存する）。
// 新しい順に、同じ量は1つにまとめて、最大3つ。
export const maxRememberedAmounts = 3;

type AmountsByKey = Record<string, number[]>;

// 同じ食材の別名（「しょうゆ」「醤油」）は、同じキー。単位が違えば（本・g）、別に覚える。
function toKey(ingredientName: string, stockUnitLabel: string): string {
	const ingredient =
		findIngredientCatalogEntry(ingredientName)?.id ??
		normalizeIngredientName(ingredientName);

	return `${ingredient}|${stockUnitLabel}`;
}

// 保存された文字列を読む。形が違う項目・正の数でない量は、捨てる。
function parseAmounts(raw: string): AmountsByKey | undefined {
	const parsed: unknown = JSON.parse(raw);

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return undefined;
	}

	const amounts: AmountsByKey = {};

	for (const [key, value] of Object.entries(parsed)) {
		if (Array.isArray(value)) {
			amounts[key] = value
				.filter(
					(amount): amount is number =>
						typeof amount === "number" && Number.isFinite(amount) && amount > 0,
				)
				.slice(0, maxRememberedAmounts);
		}
	}

	return amounts;
}

export const amountMemoryItem = defineStorageItem<AmountsByKey>({
	key: storageKeys.inventoryAmountMemory,
	defaultValue: {},
	parse: parseAmounts,
	serialize: (amounts) => JSON.stringify(amounts),
});

/** 打った量を、いちばん新しいものとして覚える（同じ量は、先頭へ移す）。 */
export function rememberAmount(
	input: { ingredientName: string; stockUnitLabel: string; amount: number },
	storage?: KeyValueStorage | null,
): void {
	if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
		return;
	}

	// 既定値は共有されるので、コピーしてから書き換える。
	const amounts = { ...amountMemoryItem.read(storage) };
	const key = toKey(input.ingredientName, input.stockUnitLabel);

	amounts[key] = [
		input.amount,
		...(amounts[key] ?? []).filter((amount) => amount !== input.amount),
	].slice(0, maxRememberedAmounts);
	// 覚えられなくても、画面の操作は続ける。
	amountMemoryItem.write(amounts, storage);
}

/** 覚えた量（新しい順）。 */
export function readRememberedAmounts(
	ingredientName: string,
	stockUnitLabel: string,
	storage?: KeyValueStorage | null,
): readonly number[] {
	return (
		amountMemoryItem.read(storage)[toKey(ingredientName, stockUnitLabel)] ?? []
	);
}
