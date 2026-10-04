import * as v from "valibot";
import {
	dateStringSchema,
	expiryKindSchema,
	storageSchema,
} from "./inventory-lot-input";
import type { UpdateInventoryLotCommand } from "./inventory-lot-repository";

const updateInventoryLotInputSchema = v.object({
	lotId: v.pipe(v.string(), v.uuid("ロットIDが不正です")),
	expiresOn: v.nullable(dateStringSchema),
	expiryKind: v.nullable(expiryKindSchema),
	storage: v.nullable(storageSchema),
	saveAsIngredientDefault: v.optional(v.boolean(), false),
});

export function parseUpdateInventoryLotInput(
	input: unknown,
): UpdateInventoryLotCommand {
	return v.parse(updateInventoryLotInputSchema, input);
}
