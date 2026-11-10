import { useMemo } from "react";
import type { ShoppingConversionDefaultRepository } from "#/features/shopping/application/shopping-conversion-default-repository";
import { toInputUnitCode } from "#/features/shopping/domain/infer-inventory-conversion";
import {
	type ShoppingConversionEntry,
	toConversionDefaultKey,
} from "#/features/shopping/domain/shopping-conversion-default";
import { useShoppingConversionDefaults } from "#/features/shopping/hooks/use-shopping-conversion-defaults";
import { createDexieShoppingConversionDefaultRepository } from "#/features/shopping/infrastructure/dexie-shopping-conversion-default-repository";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import {
	type InventoryLotPurchaseUnit,
	toPurchaseUnit,
} from "../domain/inventory-lot";

// 買い物メモの「換算の記憶」（食材×単位）の、在庫の画面からの読み書き。
// 買い物メモで決めた「1個＝200g」が、在庫の候補に出る。在庫で決めた換算は、買い物メモの候補になる。
export type PurchaseUnitMemory = {
	// 食材の換算の記憶（新しい順）。
	candidates: (itemName: string) => InventoryLotPurchaseUnit[];
	// 決めた換算を覚える。覚えられなくても、操作は止めない。
	remember: (
		itemName: string,
		unit: InventoryLotPurchaseUnit,
		trackingMode: InventoryTrackingMode,
	) => Promise<void>;
};

const emptyRepository: ShoppingConversionDefaultRepository = {
	list: async () => ({}),
	set: async () => {},
};

function toStockUnitCode(unitLabel: string): "count" | "g" | "ml" {
	return unitLabel === "g" || unitLabel === "ml" ? unitLabel : "count";
}

function toCandidate(entry: ShoppingConversionEntry) {
	const { inventoryConversion } = entry;

	return toPurchaseUnit({
		inputUnitCode: entry.unitLabel ?? inventoryConversion.inputUnitCode,
		quantity: inventoryConversion.stockQuantityPerInputUnit,
		quantityUnitLabel: inventoryConversion.stockUnitLabel,
	});
}

export function usePurchaseUnitMemory(
	ownerScope: InventoryPurchaseOwnerScope | null,
): PurchaseUnitMemory {
	const repository = useMemo(
		() =>
			ownerScope
				? createDexieShoppingConversionDefaultRepository(ownerScope)
				: emptyRepository,
		[ownerScope],
	);
	const { defaults, remember } = useShoppingConversionDefaults({ repository });

	return {
		candidates(itemName) {
			const nameKey = toConversionDefaultKey(itemName);

			if (!nameKey) {
				return [];
			}

			return Object.values(defaults)
				.filter((entry) => entry.nameKey === nameKey)
				.sort((a, b) => b.usedAt - a.usedAt)
				.flatMap((entry) => toCandidate(entry) ?? []);
		},

		async remember(itemName, unit, trackingMode) {
			await remember(itemName, {
				unitLabel: unit.label,
				inventoryConversion: {
					inputUnitCode: toInputUnitCode(unit.label),
					stockUnitCode: toStockUnitCode(unit.quantityUnitLabel),
					stockUnitLabel: unit.quantityUnitLabel,
					stockQuantityPerInputUnit: unit.quantity,
					trackingMode,
				},
			});
		},
	};
}
