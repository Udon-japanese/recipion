import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import {
	maxShoppingBranchCount,
	type ShoppingBranch,
} from "#/features/shopping/domain/shopping-branch";
import type { ShoppingItem } from "#/features/shopping/domain/shopping-item";
import {
	shoppingBranchSchema,
	shoppingConversionMemorySchema,
	shoppingItemSchema,
	shoppingRecordLimits,
	shoppingStoreDefaultSchema,
	shoppingStoreSchema,
} from "#/features/shopping/domain/shopping-record-schemas";
import {
	maxShoppingStoreCount,
	type ShoppingStore,
} from "#/features/shopping/domain/shopping-store";
import type {
	ShoppingConversionMemoryRecord,
	ShoppingStoreDefault,
} from "#/local-db/database";

// 買い物メモ（この端末の中のもの）を書き出したファイルの形。ログインしなくても使える。
// 在庫とレシピのバックアップ（backup-file.ts。サーバーのもの）とは、別のファイルにする。
// 読めるのは、いまの版だけ（古い版の読み替えはしない）。
export const shoppingBackupFormat = "recipion-shopping";
export const shoppingBackupVersion = 1;

export const shoppingBackupLimits = {
	maxFileBytes: 5 * 1024 * 1024,
	maxItems: shoppingRecordLimits.maxItems,
	maxStores: maxShoppingStoreCount,
	maxBranches: maxShoppingBranchCount,
	maxStoreDefaults: shoppingRecordLimits.maxStoreDefaults,
	maxConversionMemories: shoppingRecordLimits.maxConversionMemories,
	maxNameLength: shoppingRecordLimits.maxNameLength,
} as const;

// ファイルに入れる項目は、まだ買っていないものだけ（購入済みは、在庫に入っていて、移した先では一覧を散らかすだけ）。
export type ShoppingBackupItem = ShoppingItem & {
	status: "pending" | "checked";
};

export type ShoppingBackupData = {
	items: ShoppingBackupItem[];
	stores: ShoppingStore[];
	branches: ShoppingBranch[];
	storeDefaults: ShoppingStoreDefault[];
	conversionMemories: ShoppingConversionMemoryRecord[];
};

export type ShoppingBackupFile = ShoppingBackupData & {
	format: typeof shoppingBackupFormat;
	version: typeof shoppingBackupVersion;
	exportedAt: string;
};

// 書き出すのは、まだ買っていない項目だけ。
const itemSchema = v.object({
	...shoppingItemSchema.entries,
	status: v.picklist(["pending", "checked"]),
});

const fileSchema = v.object({
	format: v.literal(shoppingBackupFormat),
	version: v.number(),
	exportedAt: v.pipe(v.string(), v.isoTimestamp()),
	items: v.pipe(
		v.array(itemSchema),
		v.maxLength(shoppingBackupLimits.maxItems),
	),
	stores: v.pipe(
		v.array(shoppingStoreSchema),
		v.maxLength(shoppingBackupLimits.maxStores),
	),
	branches: v.pipe(
		v.array(shoppingBranchSchema),
		v.maxLength(shoppingBackupLimits.maxBranches),
	),
	storeDefaults: v.pipe(
		v.array(shoppingStoreDefaultSchema),
		v.maxLength(shoppingBackupLimits.maxStoreDefaults),
	),
	conversionMemories: v.pipe(
		v.array(shoppingConversionMemorySchema),
		v.maxLength(shoppingBackupLimits.maxConversionMemories),
	),
});

function hasDuplicate(values: readonly string[]): boolean {
	return new Set(values).size !== values.length;
}

// 表の中の ID の重なりと、項目・いつも買う店から店・条件つきメモへの参照を確かめる。
// 合わないものを黙って落とすと、メモの中身を失うので、ファイル全体を断る。
function findReferenceProblem(data: ShoppingBackupData): string | null {
	if (
		hasDuplicate(data.items.map((item) => item.id)) ||
		hasDuplicate(data.stores.map((store) => store.id)) ||
		hasDuplicate(data.branches.map((branch) => branch.id)) ||
		hasDuplicate(data.storeDefaults.map((entry) => entry.nameKey)) ||
		hasDuplicate(data.conversionMemories.map((memory) => memory.key))
	) {
		return "ファイルの中で、ID が重複しています";
	}

	const storeIds = new Set(data.stores.map((store) => store.id));
	const branchIds = new Set(data.branches.map((branch) => branch.id));

	for (const item of data.items) {
		if (item.storeId !== null && !storeIds.has(item.storeId)) {
			return `「${item.name}」の店が、ファイルの中にありません`;
		}

		if ((item.branchId === null) !== (item.branchSide === null)) {
			return `「${item.name}」の条件つきメモの形が正しくありません`;
		}

		if (item.branchId !== null && !branchIds.has(item.branchId)) {
			return `「${item.name}」の条件つきメモが、ファイルの中にありません`;
		}
	}

	if (data.storeDefaults.some((entry) => !storeIds.has(entry.storeId))) {
		return "いつも買う店が、ファイルの中にありません";
	}

	return null;
}

// 書き出したファイルの文字列を読む。読めないときは、利用者に見せる文で例外を投げる。
export function parseShoppingBackupFile(text: string): ShoppingBackupFile {
	let json: unknown;

	try {
		json = JSON.parse(text);
	} catch (error) {
		throw new UserFacingError(
			"ファイルを読めませんでした（JSON ではありません）",
			{ cause: error },
		);
	}

	if (!v.is(v.object({ format: v.literal(shoppingBackupFormat) }), json)) {
		throw new UserFacingError("買い物メモのファイルではありません");
	}

	const parsed = v.safeParse(fileSchema, json);

	if (!parsed.success) {
		throw new UserFacingError("ファイルの形が正しくありません");
	}

	if (parsed.output.version !== shoppingBackupVersion) {
		throw new UserFacingError(
			`この版のファイルは読めません（版 ${parsed.output.version}）`,
		);
	}

	const file: ShoppingBackupFile = {
		...parsed.output,
		format: shoppingBackupFormat,
		version: shoppingBackupVersion,
	};
	const problem = findReferenceProblem(file);

	if (problem) {
		throw new UserFacingError(problem);
	}

	return file;
}

function isUnpurchased(item: ShoppingItem): item is ShoppingBackupItem {
	return item.status !== "purchased";
}

// 端末の買い物メモから、書き出すファイルを作る（購入済みの項目は入れない）。
export function createShoppingBackupFile(
	data: Omit<ShoppingBackupData, "items"> & { items: readonly ShoppingItem[] },
	now = new Date(),
): ShoppingBackupFile {
	return {
		format: shoppingBackupFormat,
		version: shoppingBackupVersion,
		exportedAt: now.toISOString(),
		items: data.items.filter(isUnpurchased),
		stores: [...data.stores],
		branches: [...data.branches],
		storeDefaults: [...data.storeDefaults],
		conversionMemories: [...data.conversionMemories],
	};
}

// 日本時間の日付をつけた、ファイルの名前。
export function formatShoppingBackupFileName(now = new Date()): string {
	const date = new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Asia/Tokyo",
	}).format(now);

	return `recipion-shopping-${date}.json`;
}
