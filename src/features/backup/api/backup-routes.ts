import { type Context, Hono } from "hono";
import * as v from "valibot";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import {
	isValidLinkLabel,
	maxLinksPerRecipe,
} from "#/features/recipes/domain/recipe-links";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import {
	backupDictionarySchema,
	backupInventorySchema,
	backupLimits,
	backupPublicIdSchema,
	backupRecipeParentSchema,
	parseBackupRecipe,
} from "../domain/backup-file";
import type { BackupOperations } from "./backup-operations";

export type BackupRouteDependencies = {
	resolveSession: ResolveSession;
	createOperations: (session: ResolvedSession) => BackupOperations;
};

const exportRecipesQuerySchema = v.object({
	offset: v.pipe(v.string(), v.regex(/^\d{1,9}$/u), v.transform(Number)),
});

const inspectInputSchema = v.object({
	publicIds: v.pipe(
		v.array(backupPublicIdSchema),
		v.maxLength(backupLimits.maxRecipes),
	),
});

// レシピの中身は、ここでは件数だけを確かめ、1件ずつ parseBackupRecipe で確かめる（どのレシピが悪いかを、文で返すため）。
const importRecipesInputSchema = v.object({
	recipes: v.pipe(
		v.array(v.unknown()),
		v.minLength(1),
		v.maxLength(backupLimits.recipeImportBatchSize),
	),
});

const importLinksInputSchema = v.object({
	recipes: v.pipe(
		v.array(
			v.object({
				publicId: backupPublicIdSchema,
				links: v.pipe(
					v.array(
						v.object({
							label: v.pipe(v.string(), v.check(isValidLinkLabel)),
							targetPublicId: backupPublicIdSchema,
						}),
					),
					v.maxLength(maxLinksPerRecipe),
				),
				// もとにしたレシピ（公開 ID は、読み込んだあとのもの）。
				parent: v.optional(backupRecipeParentSchema),
			}),
		),
		v.minLength(1),
		v.maxLength(backupLimits.recipeLinkImportBatchSize),
	),
});

const mergeDictionaryInputSchema = v.object({
	entries: v.pipe(
		backupDictionarySchema,
		v.maxLength(backupLimits.dictionaryImportBatchSize),
	),
});

// 書き出し・読み込みの API（/api/v1/backup）。
export function createBackupRoutes(dependencies: BackupRouteDependencies) {
	async function operationsFor(c: Context) {
		return dependencies.createOperations(
			await dependencies.resolveSession(c.req.raw.headers),
		);
	}

	return (
		new Hono()
			.get("/recipes", validate("query", exportRecipesQuerySchema), async (c) =>
				c.json(
					await (await operationsFor(c)).exportRecipes(
						c.req.valid("query").offset,
					),
					200,
				),
			)
			.get("/inventory", async (c) =>
				c.json(await (await operationsFor(c)).exportInventory(), 200),
			)
			.get("/dictionary", async (c) =>
				c.json(await (await operationsFor(c)).exportDictionary(), 200),
			)
			.post("/inspect", validate("json", inspectInputSchema), async (c) =>
				c.json(
					await (await operationsFor(c)).inspect(c.req.valid("json").publicIds),
					200,
				),
			)
			.post(
				"/recipes",
				validate("json", importRecipesInputSchema),
				async (c) => {
					const recipes = c.req.valid("json").recipes.map(parseBackupRecipe);

					return c.json(
						await (await operationsFor(c)).importRecipes(recipes),
						200,
					);
				},
			)
			.post(
				"/recipe-links",
				validate("json", importLinksInputSchema),
				async (c) =>
					c.json(
						await (await operationsFor(c)).importLinks(
							c.req.valid("json").recipes,
						),
						200,
					),
			)
			// 在庫を、ファイルの内容に置き換える。
			.post(
				"/inventory",
				validate("json", v.object({ items: backupInventorySchema })),
				async (c) =>
					c.json(
						await (await operationsFor(c)).replaceInventory(
							c.req.valid("json").items,
						),
						200,
					),
			)
			// 材料の辞書を、今の辞書に足し合わせる。
			.post(
				"/dictionary",
				validate("json", mergeDictionaryInputSchema),
				async (c) =>
					c.json(
						await (await operationsFor(c)).mergeDictionary(
							c.req.valid("json").entries,
						),
						200,
					),
			)
	);
}
