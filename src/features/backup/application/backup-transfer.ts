import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { recipeLimits } from "#/features/recipes/domain/recipe-limits";
import type { RecipeLinkReference } from "#/features/recipes/domain/recipe-links";
import {
	type BackupFile,
	type BackupInventoryItem,
	type BackupRecipe,
	backupLimits,
	createBackupFile,
} from "../domain/backup-file";
import { remapRecipeLinks } from "../domain/plan-recipe-import";

export type BackupExportDependencies = {
	loadRecipePage: (
		offset: number,
	) => Promise<{ recipes: BackupRecipe[]; nextOffset: number | null }>;
	loadInventory: () => Promise<BackupInventoryItem[]>;
};

// 書き出す：レシピは、ページに分けて読み、1つのファイルにまとめる。
export async function collectBackup(
	dependencies: BackupExportDependencies,
	now = new Date(),
): Promise<BackupFile> {
	const recipes: BackupRecipe[] = [];
	let offset: number | null = 0;

	while (offset !== null) {
		const page = await dependencies.loadRecipePage(offset);

		recipes.push(...page.recipes);
		offset = page.nextOffset;
	}

	const inventory = await dependencies.loadInventory();

	return createBackupFile(recipes, inventory, now);
}

export type ImportedRecipe = {
	filePublicId: string;
	publicId: string;
	status: "created" | "skipped";
	// リンクを付けるか（作ったもの、または、前の読み込みが、リンクを付ける前に止まったもの）。
	attachLinks: boolean;
};

export type BackupImportDependencies = {
	inspect: (
		publicIds: string[],
	) => Promise<{ ownedPublicIds: string[]; recipeCount: number }>;
	importRecipes: (recipes: BackupRecipe[]) => Promise<ImportedRecipe[]>;
	importLinks: (
		recipes: { publicId: string; links: RecipeLinkReference[] }[],
	) => Promise<{ dropped: number }>;
	replaceInventory: (
		items: BackupInventoryItem[],
	) => Promise<{ items: number; lots: number }>;
	// この端末の、まだ送れていない購入（在庫に入る前のもの）の数。
	countPendingPurchases: () => Promise<number>;
};

export type BackupImportPreview = {
	file: BackupFile;
	newRecipeCount: number;
	skippedRecipeCount: number;
	// レシピを入れられない理由（上限を超える）。
	recipeProblem: string | null;
	inventoryItemCount: number;
	// 在庫を置き換えられない理由（未送信の購入がある）。
	inventoryProblem: string | null;
};

// 読み込む前に、何が入るかを調べる（まだ何も書き込まない）。
export async function previewBackupImport(
	file: BackupFile,
	dependencies: Pick<
		BackupImportDependencies,
		"inspect" | "countPendingPurchases"
	>,
): Promise<BackupImportPreview> {
	const [inspection, pendingPurchases] = await Promise.all([
		dependencies.inspect(file.recipes.map((recipe) => recipe.publicId)),
		file.inventory.length === 0
			? Promise.resolve(0)
			: dependencies.countPendingPurchases(),
	]);
	const owned = new Set(inspection.ownedPublicIds);
	const skippedRecipeCount = file.recipes.filter((recipe) =>
		owned.has(recipe.publicId),
	).length;
	const newRecipeCount = file.recipes.length - skippedRecipeCount;
	const room = Math.max(
		0,
		recipeLimits.maxRecipesPerUser - inspection.recipeCount,
	);

	return {
		file,
		newRecipeCount,
		skippedRecipeCount,
		recipeProblem:
			newRecipeCount > room
				? `レシピは1人${recipeLimits.maxRecipesPerUser.toLocaleString("ja-JP")}件までです。あと${room.toLocaleString("ja-JP")}件しか入れられません（新しいレシピは${newRecipeCount.toLocaleString("ja-JP")}件）。`
				: null,
		inventoryItemCount: file.inventory.length,
		inventoryProblem:
			pendingPurchases > 0
				? "この端末に、まだ在庫へ送れていない購入があります。通信できるところで在庫の画面を開いて、送り終えてからお試しください。"
				: null,
	};
}

export type BackupImportOptions = {
	recipes: boolean;
	inventory: boolean;
};

export type BackupImportProgress = {
	done: number;
	total: number;
};

export type BackupImportResult = {
	createdRecipes: number;
	skippedRecipes: number;
	// 付けられなかったリンク（相手が見つからない・リンクできない）。
	droppedLinks: number;
	inventory: { items: number; lots: number } | null;
};

function chunk<T>(rows: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < rows.length; index += size) {
		chunks.push(rows.slice(index, index + size));
	}

	return chunks;
}

// 読み込む：レシピ（登録した順に、分けて送る）→ リンク → 在庫の置き換え。
// レシピは、もう持っているものを飛ばすので、途中で失敗しても、同じファイルで、やり直せる。
export async function runBackupImport(
	file: BackupFile,
	options: BackupImportOptions,
	dependencies: BackupImportDependencies,
	onProgress: (progress: BackupImportProgress) => void = () => {},
): Promise<BackupImportResult> {
	const recipes = options.recipes
		? [...file.recipes].sort((left, right) =>
				left.createdAt.localeCompare(right.createdAt),
			)
		: [];
	const recipeBatches = chunk(recipes, backupLimits.recipeImportBatchSize);
	const total =
		recipeBatches.length +
		(options.inventory && file.inventory.length > 0 ? 1 : 0);
	let done = 0;
	const imported: ImportedRecipe[] = [];

	onProgress({ done, total });

	for (const batch of recipeBatches) {
		imported.push(...(await dependencies.importRecipes(batch)));
		done += 1;
		onProgress({ done, total });
	}

	const publicIdByFilePublicId = new Map(
		imported.map((recipe) => [recipe.filePublicId, recipe.publicId]),
	);
	const createdFilePublicIds = new Set(
		imported
			.filter((recipe) => recipe.status === "created")
			.map((recipe) => recipe.filePublicId),
	);
	// 途中で止まったあとのやり直しでは、前に作ったレシピは「飛ばす」になるが、リンクがまだなければ付ける。
	const linkFilePublicIds = new Set(
		imported
			.filter((recipe) => recipe.attachLinks)
			.map((recipe) => recipe.filePublicId),
	);
	const linkUpdates = recipes.flatMap((recipe) => {
		const publicId = publicIdByFilePublicId.get(recipe.publicId);

		if (publicId === undefined || !linkFilePublicIds.has(recipe.publicId)) {
			return [];
		}

		// 本文に出てくるラベルのリンクだけ（保存と同じ規則）。
		const links = remapRecipeLinks(
			prepareRecipeForStorage(recipe.content).links,
			publicIdByFilePublicId,
		);

		return links.length === 0 ? [] : [{ publicId, links }];
	});
	let droppedLinks = 0;

	for (const batch of chunk(
		linkUpdates,
		backupLimits.recipeLinkImportBatchSize,
	)) {
		droppedLinks += (await dependencies.importLinks(batch)).dropped;
	}

	let inventory: BackupImportResult["inventory"] = null;

	if (options.inventory && file.inventory.length > 0) {
		inventory = await dependencies.replaceInventory(
			file.inventory.map((item) => ({
				...item,
				sourceRecipePublicId:
					item.sourceRecipePublicId === null
						? null
						: (publicIdByFilePublicId.get(item.sourceRecipePublicId) ??
							item.sourceRecipePublicId),
			})),
		);
		done += 1;
		onProgress({ done, total });
	}

	return {
		createdRecipes: createdFilePublicIds.size,
		skippedRecipes: imported.length - createdFilePublicIds.size,
		droppedLinks,
		inventory,
	};
}
