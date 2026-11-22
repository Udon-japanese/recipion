import * as v from "valibot";
import {
	shoppingBranchSchema,
	shoppingConversionMemorySchema,
	shoppingItemMemorySchema,
	shoppingItemSchema,
	shoppingRecordLimits,
	shoppingStoreDefaultSchema,
	shoppingStoreSchema,
} from "./shopping-record-schemas";

// サーバーと同期する、買い物メモの行の種類。行の ID は、項目・店・条件つきメモは id、
// いつも買う店・いつもの買い方は食材名のキー（nameKey）、換算の記憶は食材×単位のキー（key）。
export const shoppingRecordKinds = [
	"item",
	"store",
	"branch",
	"storeDefault",
	"conversionMemory",
	"itemMemory",
] as const;

export type ShoppingRecordKind = (typeof shoppingRecordKinds)[number];

// 端末の、送っていない行の印（どの行か、だけ。送るときに、そのときの行を読む）。
export type ShoppingSyncOutboxEntry = {
	ownerScope: `user:${string}`;
	kind: ShoppingRecordKind;
	id: string;
	// 書くたびに変わる印。送っている間に、また書かれたら、送り終えても印を外さない。
	changeId: string;
};

export const shoppingSyncLimits = {
	// 1回に送る行の数。
	maxPushRecords: 100,
	// 1回に受け取る行の数。
	pullPageSize: 500,
} as const;

const dataSchemas = {
	item: shoppingItemSchema,
	store: shoppingStoreSchema,
	branch: shoppingBranchSchema,
	storeDefault: shoppingStoreDefaultSchema,
	conversionMemory: shoppingConversionMemorySchema,
	itemMemory: shoppingItemMemorySchema,
} as const;

type ShoppingRecordData = {
	[Kind in ShoppingRecordKind]: v.InferOutput<(typeof dataSchemas)[Kind]>;
};

// 同期する1行。消した行も、消したことを、ほかの端末に伝えるため、行として送る（data は null）。
export type ShoppingSyncRecord = {
	[Kind in ShoppingRecordKind]:
		| { kind: Kind; id: string; deleted: false; data: ShoppingRecordData[Kind] }
		| { kind: Kind; id: string; deleted: true; data: null };
}[ShoppingRecordKind];

// 行の ID が、中身の ID と同じか（違う行を、別の ID で上書きしない）。
export function shoppingRecordIdOf(
	record: Extract<ShoppingSyncRecord, { deleted: false }>,
): string {
	switch (record.kind) {
		case "storeDefault":
		case "itemMemory":
			return record.data.nameKey;
		case "conversionMemory":
			return record.data.key;
		default:
			return record.data.id;
	}
}

const idSchema = v.pipe(
	v.string(),
	v.minLength(1),
	v.maxLength(shoppingRecordLimits.maxConversionMemoryKeyLength),
);

// 消した行（中身なし）。
const deletedRecordSchema = v.object({
	kind: v.picklist(shoppingRecordKinds),
	id: idSchema,
	deleted: v.literal(true),
	data: v.null(),
});

function liveRecordSchema<
	Kind extends ShoppingRecordKind,
	Data extends (typeof dataSchemas)[Kind],
>(kind: Kind, data: Data) {
	return v.object({
		kind: v.literal(kind),
		id: idSchema,
		deleted: v.literal(false),
		data,
	});
}

// 同期する1行の形（種類ごとの中身まで、すべて書く。API の契約にも、この形が出る）。
export const shoppingSyncRecordSchema = v.variant("deleted", [
	deletedRecordSchema,
	v.variant("kind", [
		liveRecordSchema("item", dataSchemas.item),
		liveRecordSchema("store", dataSchemas.store),
		liveRecordSchema("branch", dataSchemas.branch),
		liveRecordSchema("storeDefault", dataSchemas.storeDefault),
		liveRecordSchema("conversionMemory", dataSchemas.conversionMemory),
		liveRecordSchema("itemMemory", dataSchemas.itemMemory),
	]),
]);

// 形を確かめた1行が、行の ID と中身の ID で食い違っていないか（違う行を、別の ID で上書きしない）。
// 形では書けない規則なので、スキーマの外で確かめる（合わなければ、例外）。
export function assertShoppingRecordId(record: ShoppingSyncRecord): void {
	if (!record.deleted && shoppingRecordIdOf(record) !== record.id) {
		throw new Error("同期する行の ID が、中身と合いません");
	}
}

// 送られてきた・受け取った1行を、種類ごとの形で確かめる（合わなければ、例外）。
export function parseShoppingSyncRecord(input: unknown): ShoppingSyncRecord {
	const record: ShoppingSyncRecord = v.parse(shoppingSyncRecordSchema, input);

	assertShoppingRecordId(record);

	return record;
}
