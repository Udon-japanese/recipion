import * as v from "valibot";
import { isValidDateString } from "../domain/inventory-lot";

export const dateStringSchema = v.pipe(
	v.string(),
	v.check(isValidDateString, "日付を確認してください"),
);

export const storageSchema = v.picklist(
	["room", "fridge", "freezer"],
	"保存方法を確認してください",
);

export const expiryKindSchema = v.picklist(
	["use-by", "best-before", "none"],
	"期限の種類を確認してください",
);

// このロットを入れたときの換算（1個＝110g など）。
export const purchaseUnitSchema = v.object({
	label: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "買った単位を入力してください"),
		v.maxLength(10, "買った単位は10文字までにしてください"),
	),
	quantity: v.pipe(
		v.number(),
		v.finite("1つあたりの量を確認してください"),
		v.gtValue(0, "1つあたりの量は0より大きい数にしてください"),
		v.maxValue(1_000_000, "1つあたりの量が大きすぎます"),
	),
	quantityUnitLabel: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "1つあたりの単位を入力してください"),
		v.maxLength(10, "1つあたりの単位は10文字までにしてください"),
	),
});

export const inventoryLotInputSchema = v.object({
	acquiredOn: v.optional(dateStringSchema),
	storage: v.optional(v.nullable(storageSchema)),
	expiresOn: v.optional(v.nullable(dateStringSchema)),
	expiryKind: v.optional(v.nullable(expiryKindSchema)),
	expirySource: v.optional(
		v.nullable(
			v.picklist(["entered", "estimated"], "期限の出所を確認してください"),
		),
	),
	purchaseUnit: v.optional(v.nullable(purchaseUnitSchema)),
});
