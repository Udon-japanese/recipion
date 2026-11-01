import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import {
	isValidLinkLabel,
	maxLinksPerRecipe,
} from "#/features/recipes/domain/recipe-links";
import { requireSession } from "#/integrations/better-auth/require-session";
import {
	backupInventorySchema,
	backupLimits,
	backupPublicIdSchema,
	parseBackupRecipe,
} from "../domain/backup-file";
import {
	decideRecipeImport,
	prepareRecipeImportDocument,
} from "../domain/plan-recipe-import";
import { createDrizzleBackupRepository } from "../infrastructure/drizzle-backup-repository";

// 読み込む前の確かめ：ファイルのレシピのうち、もう自分が持っているもの（飛ばすもの）と、今のレシピの数。
export const inspectBackupServerFn = createServerFn({ method: "POST" })
	.validator((input) =>
		v.parse(
			v.object({
				publicIds: v.pipe(
					v.array(backupPublicIdSchema),
					v.maxLength(backupLimits.maxRecipes),
				),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const repository = createDrizzleBackupRepository(db, userId);
		const [owners, recipeCount] = await Promise.all([
			repository.findPublicIdOwners(data.publicIds),
			repository.countRecipes(),
		]);

		return {
			ownedPublicIds: [...owners]
				.filter(([, owner]) => owner === "self")
				.map(([publicId]) => publicId),
			recipeCount,
		};
	});

export type ImportedRecipeResult = {
	filePublicId: string;
	publicId: string;
	status: "created" | "skipped";
};

// レシピを読み込む（リンクは付けない。非公開で作るので、審査はしない）。
export const importBackupRecipesServerFn = createServerFn({ method: "POST" })
	.validator((input) =>
		v
			.parse(
				v.object({
					recipes: v.pipe(
						v.array(v.unknown()),
						v.minLength(1),
						v.maxLength(backupLimits.recipeImportBatchSize),
					),
				}),
				input,
			)
			.recipes.map(parseBackupRecipe),
	)
	.handler(async ({ data: recipes }): Promise<ImportedRecipeResult[]> => {
		const { db, userId } = await requireSession();
		const repository = createDrizzleBackupRepository(db, userId);
		const owners = await repository.findPublicIdOwners(
			recipes.map((recipe) => recipe.publicId),
		);
		const results: ImportedRecipeResult[] = [];

		for (const recipe of recipes) {
			const decision = decideRecipeImport(
				recipe.publicId,
				owners.get(recipe.publicId) ?? null,
			);

			if (decision.action === "skip") {
				results.push({
					filePublicId: recipe.publicId,
					publicId: decision.publicId,
					status: "skipped",
				});
				continue;
			}

			const created = await repository.createRecipe(
				prepareRecipeForStorage(prepareRecipeImportDocument(recipe.content)),
				decision.publicId,
			);

			results.push({
				filePublicId: recipe.publicId,
				publicId: created.publicId,
				status: "created",
			});
		}

		return results;
	});

// 読み込んだレシピに、リンクを付ける（付けられない相手は捨てて、その数を返す）。
export const importBackupRecipeLinksServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		v.parse(
			v.object({
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
						}),
					),
					v.minLength(1),
					v.maxLength(backupLimits.recipeLinkImportBatchSize),
				),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const repository = createDrizzleBackupRepository(db, userId);
		let dropped = 0;

		for (const item of data.recipes) {
			const result = await repository.replaceRecipeLinks(
				item.publicId,
				item.links,
			);

			dropped += result?.dropped ?? item.links.length;
		}

		return { dropped };
	});

// 在庫を、ファイルの内容に置き換える。
export const replaceBackupInventoryServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		v.parse(v.object({ items: backupInventorySchema }), input),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleBackupRepository(db, userId).replaceInventory(
			data.items,
		);
	});
