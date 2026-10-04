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
});
