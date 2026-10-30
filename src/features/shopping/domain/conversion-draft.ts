import * as v from "valibot";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import {
	type InventoryTrackingMode,
	inventoryTrackingModeSchema,
} from "#/features/inventory/domain/inventory-tracking-mode";
import type {
	ShoppingItem,
	ShoppingItemInventoryConversion,
} from "./shopping-item";

// 買い物項目を、在庫でどう数えるか（在庫換算）の、入力途中の値。
export type ConversionDraft = {
	stockUnitCode: "count" | "g" | "ml";
	stockUnitLabel: string;
	// 入力欄の文字のまま持つ（数として読むのは、保存するとき）。
	stockQuantityPerInputUnit: string;
	trackingMode: InventoryTrackingMode;
};

export type ShoppingItemInventoryConfiguration = {
	quantity: number;
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion;
};

const genericConversionSchema = v.object({
	stockUnitCode: v.picklist(["count", "g", "ml"]),
	stockUnitLabel: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "在庫の表示単位を入力してください"),
	),
	stockQuantityPerInputUnit: v.pipe(
		v.number(),
		v.finite("換算数量には有限の数値を指定してください"),
		v.gtValue(0, "換算数量は0より大きくしてください"),
	),
	trackingMode: inventoryTrackingModeSchema,
});

// 数量プリセットのある食材は、在庫の単位が決まっている（在庫の登録がカタログの単位に固定するため、
// ここで別の単位を選ぶと、数量が狂う）。
export function getLockedStockUnitCode(
	item: ShoppingItem,
): "count" | "g" | "ml" | null {
	const entry = findIngredientCatalogEntry(item.name);

	return entry && (entry.presets?.length ?? 0) > 0 ? entry.stockUnitCode : null;
}

// すでに換算がある項目は、その値から始める。ない項目は、カタログの在庫の単位から始める
// （「袋」のまま g の数量を入れて、800袋になるのを防ぐ）。
export function initialConversionDraft(item: ShoppingItem): ConversionDraft {
	const catalogEntry = findIngredientCatalogEntry(item.name);
	const locked = getLockedStockUnitCode(item);
	const existing = item.inventoryConversion;
	const stockUnitCode =
		locked ?? existing?.stockUnitCode ?? catalogEntry?.stockUnitCode ?? "count";

	return {
		stockUnitCode,
		stockUnitLabel:
			stockUnitCode === "count"
				? existing?.stockUnitCode === "count"
					? existing.stockUnitLabel
					: item.unitLabel?.trim() || "個"
				: getDefaultStockUnitLabel(stockUnitCode),
		// g・ml は、1つが何gかを、こちらでは決められない（1g のまま確定すると、誤った量が入る）。空にして、入力を求める。
		stockQuantityPerInputUnit:
			existing && existing.trackingMode !== "presence"
				? String(existing.stockQuantityPerInputUnit)
				: stockUnitCode === "count"
					? "1"
					: "",
		trackingMode:
			existing?.trackingMode ??
			(catalogEntry && locked ? catalogEntry.defaultTrackingMode : "estimated"),
	};
}

export function changeDraftStockUnit(
	draft: ConversionDraft,
	item: ShoppingItem,
	stockUnitCode: "count" | "g" | "ml",
): ConversionDraft {
	return {
		...draft,
		stockUnitCode,
		stockUnitLabel:
			stockUnitCode === "count"
				? item.unitLabel?.trim() || "個"
				: getDefaultStockUnitLabel(stockUnitCode),
	};
}

// 入力途中の値を、保存する換算にする。読めないときは、理由つきで throw する。
export function buildConversionConfiguration(
	item: ShoppingItem,
	draft: ConversionDraft,
): ShoppingItemInventoryConfiguration {
	// 有無だけは、量の換算がいらない（「ある」になるだけ）。
	if (draft.trackingMode === "presence") {
		const locked = getLockedStockUnitCode(item);

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

	const conversion = v.parse(genericConversionSchema, {
		stockUnitCode: draft.stockUnitCode,
		stockUnitLabel: draft.stockUnitLabel,
		stockQuantityPerInputUnit: Number(draft.stockQuantityPerInputUnit),
		trackingMode: draft.trackingMode,
	});

	return {
		quantity: item.quantity,
		unitLabel: item.unitLabel,
		inventoryConversion: {
			inputUnitCode: item.unitLabel?.trim() || "unit",
			stockUnitCode: conversion.stockUnitCode,
			// g・ml は表示単位が決まっている（「袋」のまま g の数量を入れて、800袋と表示されるのを防ぐ）。
			stockUnitLabel:
				conversion.stockUnitCode === "count"
					? conversion.stockUnitLabel
					: getDefaultStockUnitLabel(conversion.stockUnitCode),
			stockQuantityPerInputUnit: conversion.stockQuantityPerInputUnit,
			trackingMode: conversion.trackingMode,
		},
	};
}

export function describeConversionDraftError(error: unknown): string {
	if (v.isValiError(error)) {
		return error.issues[0]?.message ?? "入力内容を確認してください";
	}

	return "換算設定を保存できませんでした";
}

// 入力途中の換算が、そのまま保存できるか（確認の画面の「あと○件」の数え方に使う）。
export function isConversionDraftReady(
	item: ShoppingItem,
	draft: ConversionDraft,
): boolean {
	try {
		buildConversionConfiguration(item, draft);

		return true;
	} catch {
		return false;
	}
}
