import type { InventoryTrackingMode } from "../domain/inventory-tracking-mode";

// 数え方の呼び方（在庫に追加するときと、あとで変えるときで、そろえる）。
export const trackingModeLabels: Record<InventoryTrackingMode, string> = {
	estimated: "だいたい",
	exact: "正確",
	presence: "数えない",
};

export const trackingModeOptions: readonly {
	value: InventoryTrackingMode;
	label: string;
}[] = (["estimated", "exact", "presence"] as const).map((value) => ({
	value,
	label: trackingModeLabels[value],
}));

// 数え方の違い（あとで変えるときに、選んだものの説明として出す）。
export const trackingModeHints: Record<InventoryTrackingMode, string> = {
	estimated: "使った量が在庫より多くても、0 で止めます。",
	exact: "在庫より多くは、減らせません。",
	presence:
		"量は記録せず、あれば「足りている」とします。いまの量の記録は残りません。",
};
