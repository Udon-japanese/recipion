import type { InventoryTrackingMode } from "#/features/inventory/domain/inventory-tracking-mode";
import type {
	IngredientCatalogEntry,
	IngredientPurchasePreset,
	IngredientStockUnitCode,
} from "./ingredient-catalog";

type CatalogEntryInput = Omit<IngredientCatalogEntry, "defaultTrackingMode"> &
	Partial<Pick<IngredientCatalogEntry, "defaultTrackingMode">>;

// 管理方法の初期値は、特に指定がなければ「だいたいで管理」。
export function entry(input: CatalogEntryInput): IngredientCatalogEntry {
	return { defaultTrackingMode: "estimated", ...input };
}

// 種類ごとのファイルで、カテゴリの初期値を付ける。個別に categoryId を持つ食材は、そちらを優先する。
export function withDefaultCategory(
	categoryId: NonNullable<IngredientCatalogEntry["categoryId"]>,
	entries: readonly IngredientCatalogEntry[],
): readonly IngredientCatalogEntry[] {
	return entries.map((item) => ({ categoryId, ...item }));
}

type PurchasePresetSpec = {
	label: string;
	quantity: number;
	// 買い物メモに表示する単位（「袋」「パック」「ml」など）。
	unit: string;
	// 買った単位の、英小文字のコード（count、g、kg、ml、l、bag、pack、bottle、can、box）。
	code: string;
	// 買った単位1つが、在庫の単位でいくつか。
	per: number;
};

// 買うときの数量プリセットを作る。在庫の単位と管理方法は、食材と同じにする
// （食材の stockUnitCode と defaultTrackingMode に合わせる。ずれたら、カタログのテストが失敗する）。
export function presetsFor(
	stockUnitCode: IngredientStockUnitCode,
	specs: readonly PurchasePresetSpec[],
	trackingMode: InventoryTrackingMode = "estimated",
): IngredientPurchasePreset[] {
	const stockUnitLabels = { count: "個", g: "g", ml: "ml" } as const;

	return specs.map((spec) => ({
		label: spec.label,
		quantity: spec.quantity,
		unitLabel: spec.unit,
		inventoryConversion: {
			inputUnitCode: spec.code,
			stockUnitCode,
			stockUnitLabel: stockUnitLabels[stockUnitCode],
			stockQuantityPerInputUnit: spec.per,
			trackingMode,
		},
	}));
}
