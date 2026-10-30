import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import type { ShoppingItem } from "./shopping-item";

// 換算がそろっている商品の、「在庫に入る量」の式（例：「3パック × 150g ＝ 450g」）。
// 量を数えない商品は、式がないので、null。
export function describePurchaseResult(item: ShoppingItem): string | null {
	const conversion = item.inventoryConversion;

	if (!conversion || conversion.trackingMode === "presence") {
		return null;
	}

	const quantity = formatQuantity(item.quantity, { grouping: false });
	const unit = item.unitLabel?.trim() || "つ";
	const perUnit = formatQuantity(conversion.stockQuantityPerInputUnit, {
		grouping: false,
	});
	const total = formatQuantity(
		item.quantity * conversion.stockQuantityPerInputUnit,
		{ grouping: false },
	);
	const label = conversion.stockUnitLabel;

	return `${quantity}${unit} × ${perUnit}${label} ＝ ${total}${label}`;
}
