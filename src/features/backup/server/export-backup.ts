import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";
import type { BackupInventoryItem } from "../domain/backup-file";
import { createDrizzleBackupRepository } from "../infrastructure/drizzle-backup-repository";

// 1回に読むレシピの数（Workers の CPU 時間に収めるため、ページに分ける）。
const recipePageSize = 25;

// 自分のレシピを、登録した順に、ページに分けて書き出す。
export const exportBackupRecipesServerFn = createServerFn({ method: "GET" })
	.validator((input) =>
		v.parse(
			v.object({ offset: v.pipe(v.number(), v.integer(), v.minValue(0)) }),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const recipes = await createDrizzleBackupRepository(db, userId).listRecipes(
			data.offset,
			recipePageSize + 1,
		);

		return {
			recipes: recipes.slice(0, recipePageSize),
			nextOffset:
				recipes.length > recipePageSize ? data.offset + recipePageSize : null,
		};
	});

// 在庫（在庫のあるロットだけ）を書き出す。ID と日時は、読み込むときに作り直すので、入れない。
export const exportBackupInventoryServerFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<BackupInventoryItem[]> => {
	const { db, userId } = await requireSession();
	const items = await createDrizzleInventoryRepository(db, userId).list();

	return items.map((item) => ({
		name: item.name,
		displayName: item.displayName,
		stockUnitCode: item.stockUnitCode,
		stockUnitLabel: item.stockUnitLabel,
		trackingMode: item.trackingMode,
		defaultExpiryKind: item.defaultExpiryKind,
		defaultStorage: item.defaultStorage,
		sourceRecipePublicId: item.sourceRecipePublicId ?? null,
		lots: item.lots.map((lot) => ({
			quantity: lot.quantity,
			acquiredOn: lot.acquiredOn,
			storage: lot.storage,
			expiresOn: lot.expiresOn,
			expiryKind: lot.expiryKind,
			expirySource: lot.expirySource,
		})),
	}));
});
