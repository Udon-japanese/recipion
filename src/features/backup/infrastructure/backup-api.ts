import { apiClient, readApiResponse } from "#/api/client";
import type {
	BackupExportDependencies,
	BackupImportDependencies,
} from "../application/backup-transfer";

// 書き出し・読み込みの API（/api/v1/backup）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const backup = apiClient.api.v1.backup;

export const backupExportApi: BackupExportDependencies = {
	loadRecipePage: async (offset) =>
		readApiResponse(
			await backup.recipes.$get({ query: { offset: String(offset) } }),
		),
	loadInventory: async () => readApiResponse(await backup.inventory.$get()),
	loadDictionary: async () => readApiResponse(await backup.dictionary.$get()),
};

export const backupImportApi: Omit<
	BackupImportDependencies,
	"countPendingPurchases"
> = {
	inspect: async (publicIds) =>
		readApiResponse(await backup.inspect.$post({ json: { publicIds } })),
	importRecipes: async (recipes) =>
		readApiResponse(await backup.recipes.$post({ json: { recipes } })),
	importLinks: async (recipes) =>
		readApiResponse(await backup["recipe-links"].$post({ json: { recipes } })),
	replaceInventory: async (items) =>
		readApiResponse(await backup.inventory.$post({ json: { items } })),
	mergeDictionary: async (entries) =>
		readApiResponse(await backup.dictionary.$post({ json: { entries } })),
};
