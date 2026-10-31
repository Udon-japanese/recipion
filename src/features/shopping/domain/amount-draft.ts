import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	getLockedStockUnitCode,
	type ShoppingItemInventoryConfiguration,
} from "./conversion-draft";
import type { ShoppingItem } from "./shopping-item";

type StockUnitCode = "count" | "g" | "ml";

// 単位のリスト（選ぶ）。g・ml は、重さ・体積で数える。それ以外は、個数として数え、選んだ文字を表示する。
export const otherUnitValue = "other";
const countUnits = ["個", "枚", "本", "袋", "パック"] as const;

export type UnitOption = { value: string; label: string };

// 選べる単位。単位が決まっている食材は、その種類だけ（g・ml・個数のどれか）。
export function listUnitOptions(item: ShoppingItem): readonly UnitOption[] {
	const locked = getLockedStockUnitCode(item);
	const weight: UnitOption[] = [
		{ value: "g", label: "g" },
		{ value: "ml", label: "ml" },
	];
	const count: UnitOption[] = [
		...countUnits.map((unit) => ({ value: unit, label: unit })),
		{ value: otherUnitValue, label: "その他" },
	];

	if (locked === "g") return weight.slice(0, 1);
	if (locked === "ml") return weight.slice(1);
	if (locked === "count") return count;

	return [...weight, ...count];
}

// 在庫換算が足りない商品の、量を聞く画面の入力（「買った1つが、在庫でいくつか」＝ 数 ＋ 単位）。
export type AmountDraft = {
	// 買った1つあたりの数（入力欄の文字のまま）。
	quantityText: string;
	// 選んだ単位（g・ml・個数の文字・「その他」）。
	unit: string;
	// 「その他」を選んだときの、単位の文字。
	customUnit: string;
	// 量を数えない（あるか、ないかだけ見る）。
	isPresence: boolean;
	// 「候補から選ぶ」（6個、など）を選んだときの、数量・単位・換算。選ぶと、そのまま保存する。入力を直すと、外れる。
	preset?: ShoppingItemInventoryConfiguration;
};

// 単位の文字を、リストの選択（と「その他」の文字）にする。
function toUnitChoice(label: string): Pick<AmountDraft, "unit" | "customUnit"> {
	if (label === "g" || label === "ml") {
		return { unit: label, customUnit: "" };
	}

	return (countUnits as readonly string[]).includes(label)
		? { unit: label, customUnit: "" }
		: { unit: otherUnitValue, customUnit: label };
}

function defaultUnitCode(item: ShoppingItem): StockUnitCode {
	return (
		getLockedStockUnitCode(item) ??
		findIngredientCatalogEntry(item.name)?.stockUnitCode ??
		"count"
	);
}

// 個数・枚数の食材は、「1」と、買った単位から始める。グラム・ミリリットルの食材は、1つが何かを、こちらでは決められないので、数を空にする。
export function initialAmountDraft(item: ShoppingItem): AmountDraft {
	const code = defaultUnitCode(item);

	if (code === "count") {
		return {
			quantityText: "1",
			...toUnitChoice(item.unitLabel?.trim() || "個"),
			isPresence: false,
		};
	}

	return { quantityText: "", unit: code, customUnit: "", isPresence: false };
}

export function applyAmountPreset(
	preset: ShoppingItemInventoryConfiguration,
): AmountDraft {
	const conversion = preset.inventoryConversion;

	return {
		quantityText: formatQuantity(conversion.stockQuantityPerInputUnit, {
			grouping: false,
		}),
		...toUnitChoice(conversion.stockUnitLabel),
		isPresence: conversion.trackingMode === "presence",
		preset,
	};
}

type ParsedAmount = {
	stockUnitCode: StockUnitCode;
	stockUnitLabel: string;
	quantity: number;
};

// 入力を読む。数が読めない・0以下・「その他」の単位が空のときは、null。
function parseAmount(draft: AmountDraft): ParsedAmount | null {
	const quantity = parseQuantityInput(draft.quantityText);
	const label = (
		draft.unit === otherUnitValue ? draft.customUnit : draft.unit
	).trim();

	if (quantity === null || quantity <= 0 || label === "") {
		return null;
	}

	if (label === "g" || label === "ml") {
		return { stockUnitCode: label, stockUnitLabel: label, quantity };
	}

	return { stockUnitCode: "count", stockUnitLabel: label, quantity };
}

// 入力が読めたときの、在庫に入る量（例：「600g」）。読めなければ null。
export function describeAmountTotal(
	item: ShoppingItem,
	draft: AmountDraft,
): string | null {
	const parsed = draft.isPresence ? null : parseAmount(draft);

	if (!parsed) {
		return null;
	}

	const bought = draft.preset?.quantity ?? item.quantity;

	return `${formatQuantity(bought * parsed.quantity, { grouping: false })}${parsed.stockUnitLabel}`;
}

// 入力を、保存する換算にする。読めないときは、理由つきで throw する。
export function buildAmountConfiguration(
	item: ShoppingItem,
	draft: AmountDraft,
): ShoppingItemInventoryConfiguration {
	if (draft.preset) {
		return draft.preset;
	}

	const locked = getLockedStockUnitCode(item);

	if (draft.isPresence) {
		return {
			quantity: item.quantity,
			unitLabel: item.unitLabel,
			inventoryConversion: {
				inputUnitCode: item.unitLabel?.trim() || "unit",
				stockUnitCode: locked ?? "count",
				stockUnitLabel: locked ? getDefaultStockUnitLabel(locked) : "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "presence",
			},
		};
	}

	const parsed = parseAmount(draft);

	if (!parsed) {
		throw new Error(
			draft.unit === otherUnitValue && draft.customUnit.trim() === ""
				? "単位を入れてください"
				: "0より大きい数を入れてください（例：300）",
		);
	}

	const entry = findIngredientCatalogEntry(item.name);

	return {
		quantity: item.quantity,
		unitLabel: item.unitLabel,
		inventoryConversion: {
			inputUnitCode: item.unitLabel?.trim() || "unit",
			stockUnitCode: parsed.stockUnitCode,
			stockUnitLabel: parsed.stockUnitLabel,
			stockQuantityPerInputUnit: parsed.quantity,
			trackingMode: entry && locked ? entry.defaultTrackingMode : "estimated",
		},
	};
}

export function describeAmountDraftError(error: unknown): string {
	return error instanceof Error
		? error.message
		: "在庫に入れる量を確認してください";
}
