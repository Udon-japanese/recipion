import { type Context, Hono } from "hono";
import * as v from "valibot";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import {
	expectedUserIdSchema,
	withExpectedUserId,
} from "#/integrations/better-auth/expected-user";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import {
	adjustInventoryInputSchema,
	parseAdjustInventoryInput,
} from "../application/adjust-inventory-input";
import {
	changeInventoryTrackingModeInputSchema,
	parseChangeInventoryTrackingModeInput,
} from "../application/change-inventory-tracking-mode-input";
import type {
	InventoryAdjustmentRepository,
	MadeRecipeStockRepository,
	RecipeConsumptionCorrectionRepository,
	RecipeConsumptionUndoRepository,
} from "../application/inventory-adjustment-repository";
import {
	changeStockUnitInputSchema,
	deleteInventoryItemInputSchema,
	parseChangeStockUnitInput,
	parseDeleteInventoryItemInput,
	parseRenameInventoryItemInput,
	parseSetInventoryItemArtInput,
	parseSetInventoryItemCategoryInput,
	renameInventoryItemInputSchema,
	setInventoryItemArtInputSchema,
	setInventoryItemCategoryInputSchema,
} from "../application/inventory-item-management-input";
import type { InventoryItemManagementRepository } from "../application/inventory-item-management-repository";
import type { InventoryItemResolver } from "../application/inventory-item-resolver";
import type { InventoryLotRepository } from "../application/inventory-lot-repository";
import type { InventoryQueryRepository } from "../application/inventory-query-repository";
import type { InventoryTrackingModeRepository } from "../application/inventory-tracking-mode-repository";
import {
	correctRecipeConsumptionInputSchema,
	undoRecipeConsumptionInputSchema,
} from "../application/recipe-consumption-input";
import { recordInventoryPurchase } from "../application/record-inventory-purchase";
import {
	parseRecordInventoryPurchaseInput,
	recordInventoryPurchaseInputSchema,
} from "../application/record-inventory-purchase-input";
import {
	parseRegisterInventoryItemInput,
	registerInventoryItem,
	registerInventoryItemInputSchema,
} from "../application/register-inventory-item";
import {
	stockMadeRecipe,
	stockMadeRecipeInputSchema,
} from "../application/stock-made-recipe";
import {
	parseUpdateInventoryLotInput,
	updateInventoryLotInputSchema,
} from "../application/update-inventory-lot-input";

// 在庫の読み書きをする先（本番は Drizzle の repository。テストで差し替える）。
export type InventoryRepository = InventoryQueryRepository &
	InventoryItemResolver &
	InventoryAdjustmentRepository &
	MadeRecipeStockRepository &
	RecipeConsumptionCorrectionRepository &
	RecipeConsumptionUndoRepository &
	InventoryTrackingModeRepository &
	InventoryLotRepository &
	InventoryItemManagementRepository;

export type InventoryRouteDependencies = {
	resolveSession: ResolveSession;
	createRepository: (session: ResolvedSession) => InventoryRepository;
};

// 形の確認（validate）のあと、形では書けない規則は、今までの parse…Input の関数で確かめる（同じスキーマを使う）。
// 在庫の API（/api/v1/inventory）。
export function createInventoryRoutes(
	dependencies: InventoryRouteDependencies,
) {
	async function repositoryFor(c: Context, expectedUserId?: string) {
		const session = await dependencies.resolveSession(c.req.raw.headers, {
			expectedUserId,
		});

		return dependencies.createRepository(session);
	}

	return (
		new Hono()
			// 一覧は、端末のキャッシュ（所有者の印ごと）に入るので、画面が思っているユーザーと違えば断る。
			.get(
				"/items",
				validate(
					"query",
					v.object({ expectedUserId: v.optional(expectedUserIdSchema) }),
				),
				async (c) => {
					const { expectedUserId } = c.req.valid("query");
					const repository = await repositoryFor(c, expectedUserId);

					return c.json(await repository.list(), 200);
				},
			)
			// 食材は名前で決まる（別の人の在庫にも、同じ名前で入ってしまう）ので、画面が思っているユーザーと違えば断る。
			.post(
				"/items",
				validate(
					"json",
					withExpectedUserId(registerInventoryItemInputSchema.entries),
				),
				async (c) => {
					const { expectedUserId, ...rest } = c.req.valid("json");
					const item = parseRegisterInventoryItemInput(rest);
					const repository = await repositoryFor(c, expectedUserId);

					return c.json(
						await registerInventoryItem(item, {
							inventoryItemResolver: repository,
							inventoryAdjustmentRepository: repository,
							inventoryTrackingModeRepository: repository,
						}),
						200,
					);
				},
			)
			// 端末に貯めた購入（その人の所有者の印つき）を送る。送った時点のセッションが別の人なら、その人の在庫に入れずに断る。
			.post(
				"/purchases",
				validate(
					"json",
					withExpectedUserId(recordInventoryPurchaseInputSchema.entries),
				),
				async (c) => {
					const { expectedUserId, ...rest } = c.req.valid("json");
					const purchase = parseRecordInventoryPurchaseInput(rest);
					const repository = await repositoryFor(c, expectedUserId);

					return c.json(
						await recordInventoryPurchase(purchase, {
							inventoryItemResolver: repository,
							inventoryAdjustmentRepository: repository,
						}),
						200,
					);
				},
			)
			.post(
				"/adjustments",
				validate("json", adjustInventoryInputSchema),
				async (c) => {
					const command = parseAdjustInventoryInput(c.req.valid("json"));
					const repository = await repositoryFor(c);

					return c.json(await repository.applyAdjustment(command), 200);
				},
			)
			.post(
				"/items/tracking-mode",
				validate("json", changeInventoryTrackingModeInputSchema),
				async (c) => {
					const command = parseChangeInventoryTrackingModeInput(
						c.req.valid("json"),
					);
					const repository = await repositoryFor(c);

					return c.json(await repository.changeTrackingMode(command), 200);
				},
			)
			.post(
				"/items/delete",
				validate("json", deleteInventoryItemInputSchema),
				async (c) => {
					const { inventoryItemId } = parseDeleteInventoryItemInput(
						c.req.valid("json"),
					);
					const repository = await repositoryFor(c);

					return c.json(await repository.deleteItem(inventoryItemId), 200);
				},
			)
			.post(
				"/items/rename",
				validate("json", renameInventoryItemInputSchema),
				async (c) => {
					const command = parseRenameInventoryItemInput(c.req.valid("json"));
					const repository = await repositoryFor(c);

					return c.json(await repository.renameItem(command), 200);
				},
			)
			.post(
				"/items/art",
				validate("json", setInventoryItemArtInputSchema),
				async (c) => {
					const command = parseSetInventoryItemArtInput(c.req.valid("json"));
					const repository = await repositoryFor(c);

					return c.json(await repository.setItemArt(command), 200);
				},
			)
			.post(
				"/items/category",
				validate("json", setInventoryItemCategoryInputSchema),
				async (c) => {
					const command = parseSetInventoryItemCategoryInput(
						c.req.valid("json"),
					);
					const repository = await repositoryFor(c);

					return c.json(await repository.setItemCategory(command), 200);
				},
			)
			.post(
				"/items/stock-unit",
				validate("json", changeStockUnitInputSchema),
				async (c) => {
					const command = parseChangeStockUnitInput(c.req.valid("json"));
					const repository = await repositoryFor(c);

					return c.json(await repository.changeStockUnit(command), 200);
				},
			)
			.post(
				"/lots/update",
				validate("json", updateInventoryLotInputSchema),
				async (c) => {
					const command = parseUpdateInventoryLotInput(c.req.valid("json"));
					const repository = await repositoryFor(c);

					return c.json(await repository.updateLot(command), 200);
				},
			)
			.post(
				"/made-recipes/stock",
				validate("json", stockMadeRecipeInputSchema),
				async (c) => {
					const repository = await repositoryFor(c);

					return c.json(
						await stockMadeRecipe(c.req.valid("json"), repository),
						200,
					);
				},
			)
			.post(
				"/recipe-consumptions/correct",
				validate("json", correctRecipeConsumptionInputSchema),
				async (c) => {
					const repository = await repositoryFor(c);

					return c.json(
						await repository.correctRecipeConsumption(c.req.valid("json")),
						200,
					);
				},
			)
			.post(
				"/recipe-consumptions/undo",
				validate("json", undoRecipeConsumptionInputSchema),
				async (c) => {
					const { sourceId, inventoryItemIds } = c.req.valid("json");
					const repository = await repositoryFor(c);

					return c.json(
						await repository.undoRecipeConsumption(sourceId, inventoryItemIds),
						200,
					);
				},
			)
	);
}
