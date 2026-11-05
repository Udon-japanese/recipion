import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { recordInventoryPurchase } from "#/features/inventory/application/record-inventory-purchase";
import { parseRecordInventoryPurchaseInput } from "#/features/inventory/application/record-inventory-purchase-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import { requireSession } from "#/integrations/better-auth/require-session";

// 端末に貯めた購入（その人の所有者の印つき）を送る。食材は名前で決まるので、
// 送った時点の Cookie が別の人なら、その人の在庫に入れずに断る。
export const recordInventoryPurchaseServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		const { expectedUserId, ...rest } = v.parse(
			v.looseObject({ expectedUserId: expectedUserIdSchema }),
			input,
		);

		return {
			expectedUserId,
			purchase: parseRecordInventoryPurchaseInput(rest),
		};
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		const repository = createDrizzleInventoryRepository(db, userId);

		return recordInventoryPurchase(data.purchase, {
			inventoryItemResolver: repository,
			inventoryAdjustmentRepository: repository,
		});
	});
