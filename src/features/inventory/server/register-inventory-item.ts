import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import {
	parseRegisterInventoryItemInput,
	registerInventoryItem,
} from "#/features/inventory/application/register-inventory-item";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import { requireSession } from "#/integrations/better-auth/require-session";

// 食材は名前で決まる（別の人の在庫にも、同じ名前で入ってしまう）ので、画面が思っているユーザーと違えば断る。
export const registerInventoryItemServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		const { expectedUserId, ...rest } = v.parse(
			v.looseObject({ expectedUserId: expectedUserIdSchema }),
			input,
		);

		return { expectedUserId, item: parseRegisterInventoryItemInput(rest) };
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		const repository = createDrizzleInventoryRepository(db, userId);

		return registerInventoryItem(data.item, {
			inventoryItemResolver: repository,
			inventoryAdjustmentRepository: repository,
			inventoryTrackingModeRepository: repository,
		});
	});
