import { UserFacingError } from "#/errors/user-facing-error";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { toBaseMeasureAmount } from "#/features/quantity/domain/measure-units";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	describePurchaseUnit,
	type InventoryLotPurchaseUnit,
	toPurchaseUnit,
} from "./inventory-lot";

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
 * 換算が、在庫の量に直せる形か（ロットの換算で引く・買い物メモから入れるときに使える形）。
 * - 買った単位が、在庫の単位（在庫が袋で「1袋＝6枚」「1袋＝300g」）。右は何でもよい（枚で打った量を、袋に直して引く）。
 * - 1つあたりの量が、在庫の単位か g・ml（在庫が枚で「1袋＝6枚」、在庫が g で「1パック＝300g」）。
 * 在庫が g で「1袋＝6枚」のように、どちらでもないものは、枚が何 g かわからないので、直せない。
 */
export function fitsStockUnit(
	unit: InventoryLotPurchaseUnit,
	stockUnitLabel: string,
): boolean {
	return (
		unit.label === stockUnitLabel ||
		unit.quantityUnitLabel === stockUnitLabel ||
		unit.quantityUnitLabel === "g" ||
		unit.quantityUnitLabel === "ml"
	);
}

/**
 * 入力欄の中身を、ロットの換算にする。量が空なら、換算なし（null）。
 * 量が読めない・0以下、単位の呼び名が空、在庫の量に直せない（fitsStockUnit）ときは、理由つきで throw する。
 */
export function parsePurchaseUnitDraft(
	draft: PurchaseUnitDraft,
	stockUnitLabel: string,
): InventoryLotPurchaseUnit | null {
	if (draft.quantityText.trim() === "") {
		return null;
	}

	const quantity = parseQuantityInput(draft.quantityText);

	if (quantity === null || quantity <= 0) {
		throw new UserFacingError("1つあたりの量を確認してください（例：200）", {
			code: "INVALID_INPUT",
		});
	}

	const label = draft.label.trim();

	if (label === "") {
		throw new UserFacingError("買った単位を入力してください（例：個）", {
			code: "INVALID_INPUT",
		});
	}

	if (draft.quantityUnitLabel.trim() === "") {
		throw new UserFacingError("1つあたりの単位を入力してください（例：枚）", {
			code: "INVALID_INPUT",
		});
	}

	// kg・L で打った量は、g・ml で持つ（1袋＝1.5kg → 1500g）。
	const base = toBaseMeasureAmount({
		quantity,
		unitLabel: draft.quantityUnitLabel,
	});

	const unit = {
		label,
		quantity: base.quantity,
		quantityUnitLabel: base.unitLabel.trim(),
	};

	if (!fitsStockUnit(unit, stockUnitLabel)) {
		throw new UserFacingError(
			`在庫は${stockUnitLabel}で数えるので、1${label}＝◯${unit.quantityUnitLabel}は使えません（左を${stockUnitLabel}にするか、右を${stockUnitLabel}・g・mlにしてください）`,
			{ code: "INVALID_INPUT" },
		);
	}

	return unit;
}

/**
 * 入力欄の中身の、いまの換算の表示（保存されるとおりに見せる）。
 * 換算を残さない入力（量が空・同じ単位・g・ml そのもの）は、「未設定」ではなく、在庫の単位のまま（ロットの量は、もともと在庫の単位で数えている）。
 * 読めないときは throw する（呼び出し側で、入力を確かめてもらう）。
 */
export function summarizePurchaseUnitDraft(
	draft: PurchaseUnitDraft,
	stockUnitLabel: string,
): string {
	const unit = parsePurchaseUnitDraft(draft, stockUnitLabel);
	const saved =
		unit &&
		toPurchaseUnit({
			inputUnitCode: unit.label,
			quantity: unit.quantity,
			quantityUnitLabel: unit.quantityUnitLabel,
		});

	return saved ? describePurchaseUnit(saved) : `${stockUnitLabel}のまま`;
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
