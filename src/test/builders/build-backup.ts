import type {
	BackupInventoryItem,
	BackupRecipe,
} from "#/features/backup/domain/backup-file";
import { createRecipeEditorDocument } from "#/features/recipes/domain/recipe-editor-document";

// テスト用のバックアップのレシピ（ID は、数字の通し番号から UUID の形に）。
export function buildBackupRecipe(
	overrides: Partial<Omit<BackupRecipe, "content">> & {
		content?: Partial<BackupRecipe["content"]>;
	} = {},
): BackupRecipe {
	let sequence = 0;
	const createId = () => {
		sequence += 1;

		return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
	};
	const base = createRecipeEditorDocument(
		{
			name: "肉じゃが",
			ingredientText: "じゃがいも 3個\n牛肉 200g",
			instructionText: "1. 切る\n2. 煮る",
		},
		createId,
	);

	return {
		publicId: "nikujaga",
		createdAt: "2026-10-01T00:00:00.000Z",
		...overrides,
		content: { ...base, ...overrides.content },
	};
}

// テスト用のバックアップの在庫の品目（卵）。
export function buildBackupInventoryItem(
	overrides: Partial<BackupInventoryItem> = {},
): BackupInventoryItem {
	return {
		name: "卵",
		displayName: null,
		art: null,
		stockUnitCode: "count",
		stockUnitLabel: "個",
		trackingMode: "exact",
		defaultExpiryKind: null,
		defaultStorage: null,
		sourceRecipePublicId: null,
		lots: [
			{
				quantity: 6,
				acquiredOn: "2026-10-30",
				storage: "fridge",
				expiresOn: "2026-11-10",
				expiryKind: "best-before",
				expirySource: "entered",
			},
		],
		...overrides,
	};
}
