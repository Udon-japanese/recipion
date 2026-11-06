import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { mergeIngredientDictionary } from "#/features/ingredients/application/merge-ingredient-dictionary";
import { createDrizzleIngredientDictionaryRepository } from "#/features/ingredients/infrastructure/drizzle-ingredient-dictionary-repository";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import {
	isValidLinkLabel,
	maxLinksPerRecipe,
} from "#/features/recipes/domain/recipe-links";
import { requireSession } from "#/integrations/better-auth/require-session";
import {
	backupDictionarySchema,
	backupInventorySchema,
	backupLimits,
	backupPublicIdSchema,
	backupRecipeParentSchema,
	parseBackupRecipe,
} from "../domain/backup-file";
import {
	decideRecipeImport,
	deriveImportPublicId,
	prepareRecipeImportDocument,
	type RecipeImportDecision,
} from "../domain/plan-recipe-import";
import { createDrizzleBackupRepository } from "../infrastructure/drizzle-backup-repository";

type BackupRepository = ReturnType<typeof createDrizzleBackupRepository>;

// ファイルの公開 ID ごとの、読み込み方（他の人と重なる ID は、代わりの ID の持ち主も見る）。
async function decideRecipeImports(
	repository: BackupRepository,
	userId: string,
	filePublicIds: readonly string[],
): Promise<Map<string, RecipeImportDecision>> {
	const owners = await repository.findPublicIdOwners(filePublicIds);
	const derivedIds = new Map<string, string>();

	for (const publicId of filePublicIds) {
		if (owners.get(publicId) === "other") {
			derivedIds.set(publicId, await deriveImportPublicId(userId, publicId));
		}
	}

	const derivedOwners = await repository.findPublicIdOwners([
		...derivedIds.values(),
	]);

	return new Map(
		filePublicIds.map((publicId) => {
			const derivedId = derivedIds.get(publicId);

			return [
				publicId,
				decideRecipeImport(
					publicId,
					owners.get(publicId) ?? null,
					derivedId === undefined
						? null
						: {
								publicId: derivedId,
								owner: derivedOwners.get(derivedId) ?? null,
							},
				),
			];
		}),
	);
}

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
		const [decisions, recipeCount] = await Promise.all([
			decideRecipeImports(repository, userId, data.publicIds),
			repository.countRecipes(),
		]);

		return {
			ownedPublicIds: [...decisions]
				.filter(([, decision]) => decision.action === "skip")
				.map(([publicId]) => publicId),
			recipeCount,
		};
	});

export type ImportedRecipeResult = {
	filePublicId: string;
	publicId: string;
	status: "created" | "skipped";
	// リンクを付ける（作ったもの・前の読み込みでリンクを付ける前に止まったもの）。
	// 飛ばしたレシピのうち、もうリンクがあるものは付け直さない（あとで直したリンクを、ファイルの内容に戻さない）。
	attachLinks: boolean;
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
		const decisions = await decideRecipeImports(
			repository,
			userId,
			recipes.map((recipe) => recipe.publicId),
		);
		const linked = await repository.findPublicIdsWithLinks(
			[...decisions.values()]
				.filter((decision) => decision.action === "skip")
				.map((decision) => decision.publicId),
		);
		const results: ImportedRecipeResult[] = [];

		for (const recipe of recipes) {
			const decision = decisions.get(recipe.publicId) ?? {
				action: "create",
				publicId: null,
			};

			if (decision.action === "skip") {
				results.push({
					filePublicId: recipe.publicId,
					publicId: decision.publicId,
					status: "skipped",
					attachLinks: !linked.has(decision.publicId),
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
				attachLinks: true,
			});
		}

		return results;
	});

// 読み込んだレシピに、リンクと、もとにしたレシピを付ける（付けられないリンクの相手は捨てて、その数を返す）。
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
							// もとにしたレシピ（公開 ID は、読み込んだあとのもの）。
							parent: v.optional(backupRecipeParentSchema),
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

			if (item.parent) {
				await repository.attachRecipeParent(item.publicId, item.parent);
			}
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

// ファイルの材料の辞書を、今の辞書に足し合わせる（分けて送る）。
export const mergeBackupDictionaryServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		v.parse(
			v.object({
				entries: v.pipe(
					backupDictionarySchema,
					v.maxLength(backupLimits.dictionaryImportBatchSize),
				),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return mergeIngredientDictionary(
			data.entries,
			createDrizzleIngredientDictionaryRepository(db, userId),
		);
	});
