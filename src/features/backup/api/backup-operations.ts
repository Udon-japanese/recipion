import { mergeIngredientDictionary } from "#/features/ingredients/application/merge-ingredient-dictionary";
import { listUserAliases } from "#/features/ingredients/domain/ingredient-dictionary";
import { createDrizzleIngredientDictionaryRepository } from "#/features/ingredients/infrastructure/drizzle-ingredient-dictionary-repository";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import type { RecipeLinkReference } from "#/features/recipes/domain/recipe-links";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import type {
	BackupDictionaryEntry,
	BackupInventoryItem,
	BackupRecipe,
	BackupRecipeParent,
} from "../domain/backup-file";
import {
	decideRecipeImport,
	deriveImportPublicId,
	prepareRecipeImportDocument,
	type RecipeImportDecision,
} from "../domain/plan-recipe-import";
import { createDrizzleBackupRepository } from "../infrastructure/drizzle-backup-repository";

type BackupRepository = ReturnType<typeof createDrizzleBackupRepository>;

// 1回に読むレシピの数（Workers の CPU 時間に収めるため、ページに分ける）。
const recipePageSize = 25;

export type ImportedRecipeResult = {
	filePublicId: string;
	publicId: string;
	status: "created" | "skipped";
	// リンクを付ける（作ったもの・前の読み込みでリンクを付ける前に止まったもの）。
	// 飛ばしたレシピのうち、もうリンクがあるものは付け直さない（あとで直したリンクを、ファイルの内容に戻さない）。
	attachLinks: boolean;
};

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

// 書き出し・読み込みの API（/api/v1/backup）の中身。入口の形の確認は backup-routes.ts。
export function createBackupOperations({ db, userId }: ResolvedSession) {
	const backups = createDrizzleBackupRepository(db, userId);
	const dictionary = createDrizzleIngredientDictionaryRepository(db, userId);

	return {
		// 自分のレシピを、登録した順に、ページに分けて書き出す。
		async exportRecipes(offset: number) {
			const recipes = await backups.listRecipes(offset, recipePageSize + 1);

			return {
				recipes: recipes.slice(0, recipePageSize),
				nextOffset:
					recipes.length > recipePageSize ? offset + recipePageSize : null,
			};
		},

		// 在庫（在庫のあるロットだけ）を書き出す。ID と日時は、読み込むときに作り直すので、入れない。
		async exportInventory(): Promise<BackupInventoryItem[]> {
			const items = await createDrizzleInventoryRepository(db, userId).list();

			return items.map((item) => ({
				name: item.name,
				displayName: item.displayName,
				art: item.art,
				categoryId: item.categoryId,
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
					purchaseUnit: lot.purchaseUnit,
				})),
			}));
		},

		// 自分の材料の辞書を書き出す。呼び名は、自分で足したものだけ（カタログの別名は、名前から作り直せる）。
		async exportDictionary(): Promise<BackupDictionaryEntry[]> {
			return (await dictionary.list()).map((entry) => ({
				name: entry.name,
				aliases: listUserAliases(entry),
				unmanaged: entry.unmanaged,
			}));
		},

		// 読み込む前の確かめ：ファイルのレシピのうち、もう自分が持っているもの（飛ばすもの）と、今のレシピの数。
		async inspect(publicIds: readonly string[]) {
			const [decisions, recipeCount] = await Promise.all([
				decideRecipeImports(backups, userId, publicIds),
				backups.countRecipes(),
			]);

			return {
				ownedPublicIds: [...decisions]
					.filter(([, decision]) => decision.action === "skip")
					.map(([publicId]) => publicId),
				recipeCount,
			};
		},

		// レシピを読み込む（リンクは付けない。非公開で作るので、審査はしない）。
		async importRecipes(
			recipes: readonly BackupRecipe[],
		): Promise<ImportedRecipeResult[]> {
			const decisions = await decideRecipeImports(
				backups,
				userId,
				recipes.map((recipe) => recipe.publicId),
			);
			const linked = await backups.findPublicIdsWithLinks(
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

				const created = await backups.createRecipe(
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
		},

		// 読み込んだレシピに、リンクと、もとにしたレシピを付ける（付けられないリンクの相手は捨てて、その数を返す）。
		async importLinks(
			recipes: readonly {
				publicId: string;
				links: RecipeLinkReference[];
				parent?: BackupRecipeParent;
			}[],
		) {
			let dropped = 0;

			for (const item of recipes) {
				const result = await backups.replaceRecipeLinks(
					item.publicId,
					item.links,
				);

				dropped += result?.dropped ?? item.links.length;

				if (item.parent) {
					await backups.attachRecipeParent(item.publicId, item.parent);
				}
			}

			return { dropped };
		},

		// 在庫を、ファイルの内容に置き換える。
		replaceInventory: (items: readonly BackupInventoryItem[]) =>
			backups.replaceInventory(items),

		// ファイルの材料の辞書を、今の辞書に足し合わせる（分けて送る）。
		mergeDictionary: (entries: readonly BackupDictionaryEntry[]) =>
			mergeIngredientDictionary(entries, dictionary),
	};
}

export type BackupOperations = ReturnType<typeof createBackupOperations>;
