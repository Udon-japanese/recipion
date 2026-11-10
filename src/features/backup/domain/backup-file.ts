import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import { dishPlacementsSchema } from "#/features/dish-art/domain/dish-cover";
import { isValidDateString } from "#/features/inventory/domain/inventory-lot";
import { inventoryTrackingModeSchema } from "#/features/inventory/domain/inventory-tracking-mode";
import { inventoryUnitCodeSchema } from "#/features/inventory/domain/inventory-unit";
import type { RecipeEditorDocument } from "#/features/recipes/domain/recipe-editor-document";
import { recipeLimits } from "#/features/recipes/domain/recipe-limits";
import {
	type RecipeSnapshot,
	recipeSnapshotSchema,
} from "#/features/recipes/domain/recipe-snapshot";
import { validateRecipeEditorDocument } from "#/features/recipes/domain/validate-recipe-editor-document";

// 在庫とレシピを書き出したファイル（バックアップ）の形。読めるのは、いまの版だけ（古い版の読み替えはしない）。
export const backupFormat = "recipion-backup";
// 2：レシピの人数（servings）を、できあがりの量の文字（yieldText）にした。
// 材料の増減のしかた（scaleWeight）と、この分量で作る（scalable）は、省略できる（通常・量を変えられる）ので、版2のまま。
// 3：自分の材料の辞書（名前・自分で足した呼び名・管理しない）を足した。
export const backupVersion = 3;

// ファイルの上限。レシピは1人の上限まで、在庫は、ふつうの家庭の量を大きく超える数。
export const backupLimits = {
	maxFileBytes: 20 * 1024 * 1024,
	maxRecipes: recipeLimits.maxRecipesPerUser,
	maxInventoryItems: 1000,
	maxLotsPerItem: 100,
	maxLots: 5000,
	// ロットの数量の上限（DB の numeric(18, 6) に収まる、現実的な大きさ）。
	maxLotQuantity: 1_000_000_000,
	// 1回に送る数（Workers の CPU 時間に収めるため、分けて送る）。
	recipeImportBatchSize: 10,
	recipeLinkImportBatchSize: 20,
	// 材料の辞書（ingredientDictionaryLimits と同じ上限）。
	maxDictionaryEntries: 500,
	maxDictionaryAliases: 20,
	dictionaryImportBatchSize: 50,
} as const;

const requiredText = v.pipe(v.string(), v.trim(), v.minLength(1));

const dateString = v.pipe(v.string(), v.check(isValidDateString));

// レシピの公開 ID（nanoid。URL に出る文字だけ）。
export const backupPublicIdSchema = v.pipe(
	v.string(),
	v.regex(/^[\w-]{1,100}$/u),
);

export const backupLotSchema = v.object({
	quantity: v.pipe(
		v.number(),
		v.finite(),
		v.gtValue(0),
		v.maxValue(backupLimits.maxLotQuantity),
	),
	acquiredOn: dateString,
	storage: v.nullable(v.picklist(["room", "fridge", "freezer"])),
	expiresOn: v.nullable(dateString),
	expiryKind: v.nullable(v.picklist(["use-by", "best-before", "none"])),
	expirySource: v.nullable(v.picklist(["entered", "estimated"])),
	// このロットを入れたときの換算（1玉＝40g など）。
	purchaseUnit: v.optional(
		v.nullable(
			v.object({
				label: v.pipe(requiredText, v.maxLength(10)),
				quantity: v.pipe(v.number(), v.finite(), v.gtValue(0)),
				quantityUnitLabel: v.pipe(requiredText, v.maxLength(10)),
			}),
		),
		null,
	),
});

export type BackupLot = v.InferOutput<typeof backupLotSchema>;

export const backupInventoryItemSchema = v.object({
	// 食材の名前（読み込むときは、この名前で、今ある食材と合わせる）。
	name: v.pipe(requiredText, v.maxLength(100)),
	displayName: v.nullable(v.pipe(requiredText, v.maxLength(50))),
	// ユーザーが組み立てた在庫の絵（null・なしは、名前から決める絵）。
	art: v.optional(v.nullable(dishPlacementsSchema), null),
	stockUnitCode: inventoryUnitCodeSchema,
	stockUnitLabel: v.pipe(requiredText, v.maxLength(10)),
	trackingMode: inventoryTrackingModeSchema,
	defaultExpiryKind: v.nullable(v.picklist(["use-by", "best-before", "none"])),
	defaultStorage: v.nullable(v.picklist(["room", "fridge", "freezer"])),
	// 作り置き（「作った」で入れた、できあがり）の元のレシピ。
	sourceRecipePublicId: v.nullable(backupPublicIdSchema),
	lots: v.pipe(
		v.array(backupLotSchema),
		v.maxLength(backupLimits.maxLotsPerItem),
	),
});

export type BackupInventoryItem = v.InferOutput<
	typeof backupInventoryItemSchema
>;

export const backupInventorySchema = v.pipe(
	v.array(backupInventoryItemSchema),
	v.maxLength(backupLimits.maxInventoryItems),
	v.check(
		(items) =>
			items.reduce((total, item) => total + item.lots.length, 0) <=
			backupLimits.maxLots,
	),
);

// 自分の材料（辞書）の1件。呼び名は、自分で足したものだけ（カタログの別名は、名前から作り直せる）。
export const backupDictionaryEntrySchema = v.object({
	name: v.pipe(requiredText, v.maxLength(100)),
	aliases: v.pipe(
		v.array(v.pipe(requiredText, v.maxLength(100))),
		v.maxLength(backupLimits.maxDictionaryAliases),
	),
	unmanaged: v.boolean(),
});

export type BackupDictionaryEntry = v.InferOutput<
	typeof backupDictionaryEntrySchema
>;

export const backupDictionarySchema = v.pipe(
	v.array(backupDictionaryEntrySchema),
	v.maxLength(backupLimits.maxDictionaryEntries),
);

export type BackupRecipe = {
	publicId: string;
	// 登録した日時（ISO 8601）。読み込むときは、この順に入れる（日時そのものは、読み込んだ時刻になる）。
	createdAt: string;
	content: RecipeEditorDocument;
	// もとにしたレシピ（継承したレシピだけ）。publicId は、見つからない（もうない）親なら null。
	// 読み込むと、もとにしたレシピの表示を付け直す（消せない表示を、書き出しと読み込みで消さないため）。
	parent?: BackupRecipeParent;
};

export type BackupRecipeParent = {
	publicId: string | null;
	snapshot: RecipeSnapshot;
};

export const backupRecipeParentSchema = v.object({
	publicId: v.nullable(backupPublicIdSchema),
	snapshot: recipeSnapshotSchema,
});

export type BackupFile = {
	format: typeof backupFormat;
	version: typeof backupVersion;
	exportedAt: string;
	recipes: BackupRecipe[];
	inventory: BackupInventoryItem[];
	dictionary: BackupDictionaryEntry[];
};

// レシピの中身は、ここでは形だけを見て、保存と同じ検証（validateRecipeEditorDocument）に任せる。
const backupRecipeEnvelopeSchema = v.object({
	publicId: backupPublicIdSchema,
	createdAt: v.pipe(v.string(), v.isoTimestamp()),
	content: v.unknown(),
	parent: v.optional(backupRecipeParentSchema),
});

const backupEnvelopeSchema = v.object({
	format: v.literal(backupFormat),
	version: v.number(),
	exportedAt: v.pipe(v.string(), v.isoTimestamp()),
	recipes: v.pipe(
		v.array(backupRecipeEnvelopeSchema),
		v.maxLength(backupLimits.maxRecipes),
	),
	inventory: v.array(v.unknown()),
	dictionary: v.array(v.unknown()),
});

// レシピ1件を、保存と同じ規則で確かめる。どのレシピかが分かる文にする。
export function parseBackupRecipe(input: unknown): BackupRecipe {
	const envelope = v.safeParse(backupRecipeEnvelopeSchema, input);

	if (!envelope.success) {
		throw new UserFacingError("ファイルのレシピの形が正しくありません");
	}

	try {
		return {
			publicId: envelope.output.publicId,
			createdAt: envelope.output.createdAt,
			content: validateRecipeEditorDocument(envelope.output.content),
			...(envelope.output.parent ? { parent: envelope.output.parent } : {}),
		};
	} catch (error) {
		const name = readRecipeName(envelope.output.content);
		const reason =
			error instanceof UserFacingError ? error.message : "形が正しくありません";

		throw new UserFacingError(
			name === null ? `レシピ：${reason}` : `レシピ「${name}」：${reason}`,
			{ cause: error },
		);
	}
}

function readRecipeName(content: unknown): string | null {
	if (typeof content !== "object" || content === null || !("name" in content)) {
		return null;
	}

	return typeof content.name === "string" && content.name.trim() !== ""
		? content.name.trim()
		: null;
}

// 書き出したファイルの文字列を読む。読めないときは、利用者に見せる文で例外を投げる。
export function parseBackupFile(text: string): BackupFile {
	let json: unknown;

	try {
		json = JSON.parse(text);
	} catch (error) {
		throw new UserFacingError(
			"ファイルを読めませんでした（JSON ではありません）",
			{
				cause: error,
			},
		);
	}

	const envelope = v.safeParse(
		v.object({ format: v.literal(backupFormat) }),
		json,
	);

	if (!envelope.success) {
		throw new UserFacingError("在庫とレシピのファイルではありません");
	}

	const parsed = v.safeParse(backupEnvelopeSchema, json);

	if (!parsed.success) {
		throw new UserFacingError("ファイルの形が正しくありません");
	}

	if (parsed.output.version !== backupVersion) {
		throw new UserFacingError(
			`この版のファイルは読めません（版 ${parsed.output.version}）`,
		);
	}

	const recipes = parsed.output.recipes.map(parseBackupRecipe);
	const publicIds = new Set<string>();

	for (const recipe of recipes) {
		if (publicIds.has(recipe.publicId)) {
			throw new UserFacingError("ファイルの中で、レシピの ID が重複しています");
		}

		publicIds.add(recipe.publicId);
	}

	const inventory = v.safeParse(backupInventorySchema, parsed.output.inventory);

	if (!inventory.success) {
		throw new UserFacingError("ファイルの在庫の形が正しくありません");
	}

	const dictionary = v.safeParse(
		backupDictionarySchema,
		parsed.output.dictionary,
	);

	if (!dictionary.success) {
		throw new UserFacingError("ファイルの材料の形が正しくありません");
	}

	return {
		format: backupFormat,
		version: backupVersion,
		exportedAt: parsed.output.exportedAt,
		recipes,
		inventory: inventory.output,
		dictionary: dictionary.output,
	};
}

export function createBackupFile(
	recipes: BackupRecipe[],
	inventory: BackupInventoryItem[],
	now = new Date(),
	dictionary: BackupDictionaryEntry[] = [],
): BackupFile {
	return {
		format: backupFormat,
		version: backupVersion,
		exportedAt: now.toISOString(),
		recipes,
		inventory,
		dictionary,
	};
}

// 日本時間の日付をつけた、ファイルの名前。
export function formatBackupFileName(now = new Date()): string {
	const date = new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Asia/Tokyo",
	}).format(now);

	return `recipion-backup-${date}.json`;
}
