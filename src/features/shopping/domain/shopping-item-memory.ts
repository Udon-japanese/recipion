import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { inferInventoryConversion } from "./infer-inventory-conversion";
import type { ShoppingCategoryId } from "./shopping-category";
import {
	findConversionDefault,
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
} from "./shopping-conversion-default";
import {
	getShoppingItemConvertedQuantityLabel,
	type ShoppingCategoryAssignment,
	type ShoppingItem,
	type ShoppingItemInventoryConversion,
} from "./shopping-item";

// 食材ごとの「いつもの買い方」（最後にメモに入れた・買ったときの、数量・単位・カテゴリ）。
// 換算（1袋＝200g）は、食材×単位ごとの換算の記憶に持つ。ここで単位が決まり、その単位の換算を引く。
export type ShoppingItemMemory = {
	// 食材名を正規化したもの（換算の記憶と同じキー）。
	nameKey: string;
	quantity: number;
	unitLabel: string | null;
	categoryId: ShoppingCategoryId | null;
	categoryAssignment: ShoppingCategoryAssignment;
	// 最後に使った時刻（ミリ秒）。
	usedAt: number;
};

// 食材名のキー → いつもの買い方。
export type ShoppingItemMemories = Record<string, ShoppingItemMemory>;

// 買い物メモの記憶（いつもの買い方と、食材×単位の換算）。
export type ShoppingMemories = {
	itemMemories: ShoppingItemMemories;
	conversionDefaults: ShoppingConversionDefaults;
};

// 項目から、いつもの買い方を作る（名前が空なら、覚えない）。
export function toShoppingItemMemory(
	item: Pick<
		ShoppingItem,
		"name" | "quantity" | "unitLabel" | "categoryId" | "categoryAssignment"
	>,
	usedAt: number,
): ShoppingItemMemory | null {
	const nameKey = toConversionDefaultKey(item.name);

	return nameKey
		? {
				nameKey,
				quantity: item.quantity,
				unitLabel: item.unitLabel,
				categoryId: item.categoryId,
				categoryAssignment: item.categoryAssignment,
				usedAt,
			}
		: null;
}

export function findShoppingItemMemory(
	memories: ShoppingItemMemories,
	itemName: string,
): ShoppingItemMemory | undefined {
	const nameKey = toConversionDefaultKey(itemName);

	return nameKey ? memories[nameKey] : undefined;
}

// 覚えた数量・単位・換算の候補（追加シートのチップ）。
export type RememberedShoppingChoice = {
	label: string;
	quantity: number;
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion | null;
};

// 候補の数（最近のもの1つ＋それより古いもの2つまで）。
export const maxRememberedShoppingChoices = 3;

function choiceLabel(
	quantity: number,
	unitLabel: string | null,
	inventoryConversion: ShoppingItemInventoryConversion | null,
): string {
	const amount = `${formatQuantity(quantity, { grouping: false })}${unitLabel ?? ""}`;
	// 在庫での量の合計（一覧の行と同じ。「2パック（20個）」）。買う単位と在庫の単位が同じ・有無だけで管理するなら、書かない。
	const converted = getShoppingItemConvertedQuantityLabel({
		quantity,
		inventoryConversion,
	});

	if (!converted || !inventoryConversion) {
		return amount;
	}

	return `${amount}（${inventoryConversion.isApproximate ? "約" : ""}${converted}）`;
}

/**
 * 食材の、覚えた買い方の候補（新しい順。最大3つ）。
 * - 先頭は、いつもの買い方（前回の数量・単位と、その単位の換算の記憶。なければ、食材と単位からの推定）。
 * - 続けて、その食材のほかの単位の換算の記憶（最後に使った順。数量は1）。
 */
export function listRememberedShoppingChoices(
	itemName: string,
	memories: ShoppingItemMemories,
	conversionDefaults: ShoppingConversionDefaults,
): RememberedShoppingChoice[] {
	const nameKey = toConversionDefaultKey(itemName);

	if (!nameKey) {
		return [];
	}

	const memory = memories[nameKey];
	const usual = memory
		? findConversionDefault(conversionDefaults, itemName, memory.unitLabel)
		: undefined;
	const usualConversion = memory
		? (usual?.inventoryConversion ??
			inferInventoryConversion(itemName, memory.unitLabel))
		: null;
	const choices: RememberedShoppingChoice[] = memory
		? [
				{
					label: choiceLabel(
						memory.quantity,
						memory.unitLabel,
						usualConversion,
					),
					quantity: memory.quantity,
					unitLabel: memory.unitLabel,
					inventoryConversion: usualConversion,
				},
			]
		: [];
	const others = Object.values(conversionDefaults)
		.filter((entry) => entry.nameKey === nameKey && entry !== usual)
		.sort((a, b) => b.usedAt - a.usedAt);

	for (const entry of others) {
		if (choices.length >= maxRememberedShoppingChoices) {
			break;
		}

		choices.push({
			label: choiceLabel(1, entry.unitLabel, entry.inventoryConversion),
			quantity: 1,
			unitLabel: entry.unitLabel,
			inventoryConversion: entry.inventoryConversion,
		});
	}

	return choices;
}
