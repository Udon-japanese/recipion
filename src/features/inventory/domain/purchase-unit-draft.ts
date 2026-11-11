import { UserFacingError } from "#/errors/user-facing-error";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { toBaseMeasureAmount } from "#/features/quantity/domain/measure-units";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import type { InventoryLotPurchaseUnit } from "./inventory-lot";

// ロットの換算（1個＝110g など）の入力欄の中身。量が空なら「換算なし」。
export type PurchaseUnitDraft = {
	// 買った単位の呼び名（個・玉・パックなど）。
	label: string;
	// 1つあたりの量（入力欄の文字のまま）。
	quantityText: string;
	// 1つあたりの量の単位（g・ml・在庫の単位の呼び名）。
	quantityUnitLabel: string;
};

export function emptyPurchaseUnitDraft(label: string): PurchaseUnitDraft {
	return { label, quantityText: "", quantityUnitLabel: "g" };
}

// ロットの換算を、入力欄の中身にする（なければ空）。
export function toPurchaseUnitDraft(
	unit: InventoryLotPurchaseUnit | null,
	fallbackLabel: string,
): PurchaseUnitDraft {
	return unit
		? {
				label: unit.label,
				quantityText: formatQuantity(unit.quantity, { grouping: false }),
				quantityUnitLabel: unit.quantityUnitLabel,
			}
		: emptyPurchaseUnitDraft(fallbackLabel);
}

/**
 * 入力欄の中身を、ロットの換算にする。量が空なら、換算なし（null）。
 * 量が読めない・0以下、単位の呼び名が空のときは、理由つきで throw する。
 */
export function parsePurchaseUnitDraft(
	draft: PurchaseUnitDraft,
): InventoryLotPurchaseUnit | null {
	if (draft.quantityText.trim() === "") {
		return null;
	}

	const quantity = parseQuantityInput(draft.quantityText);

	if (quantity === null || quantity <= 0) {
		throw new UserFacingError("1つあたりの量を確認してください（例：200）");
	}

	const label = draft.label.trim();

	if (label === "") {
		throw new UserFacingError("買った単位を入力してください（例：個）");
	}

	// kg・L で打った量は、g・ml で持つ（1袋＝1.5kg → 1500g）。
	const base = toBaseMeasureAmount({
		quantity,
		unitLabel: draft.quantityUnitLabel,
	});

	return {
		label,
		quantity: base.quantity,
		quantityUnitLabel: base.unitLabel,
	};
}

function isSameUnit(
	a: InventoryLotPurchaseUnit,
	b: InventoryLotPurchaseUnit,
): boolean {
	return (
		a.label === b.label &&
		a.quantity === b.quantity &&
		a.quantityUnitLabel === b.quantityUnitLabel
	);
}

/**
 * 候補にする換算（先に並べたものほど優先）。同じものは1つにまとめ、最大 max 個。
 * ロットの換算（新しい順）→ 買い物メモの記憶、の順に渡す。
 */
export function collectPurchaseUnitCandidates(
	sources: readonly (InventoryLotPurchaseUnit | null | undefined)[],
	max = 3,
): InventoryLotPurchaseUnit[] {
	const candidates: InventoryLotPurchaseUnit[] = [];

	for (const unit of sources) {
		if (unit && !candidates.some((candidate) => isSameUnit(candidate, unit))) {
			candidates.push(unit);
		}
	}

	return candidates.slice(0, max);
}
