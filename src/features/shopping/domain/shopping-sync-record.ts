import * as v from "valibot";
import {
	shoppingBranchSchema,
	shoppingConversionMemorySchema,
	shoppingItemSchema,
	shoppingRecordLimits,
	shoppingStoreDefaultSchema,
	shoppingStoreSchema,
} from "./shopping-record-schemas";

// サーバーと同期する、買い物メモの行の種類。行の ID は、項目・店・条件つきメモは id、
// いつも買う店は食材名のキー（nameKey）、換算の記憶は食材×単位のキー（key）。
export const shoppingRecordKinds = [
	"item",
	"store",
	"branch",
	"storeDefault",
	"conversionMemory",
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

const recordSchema = v.variant("deleted", [
	v.object({
		kind: v.picklist(shoppingRecordKinds),
		id: idSchema,
		deleted: v.literal(true),
		data: v.null(),
	}),
	v.object({
		kind: v.picklist(shoppingRecordKinds),
		id: idSchema,
		deleted: v.literal(false),
		data: v.unknown(),
	}),
]);

// 送られてきた・受け取った1行を、種類ごとの形で確かめる（合わなければ、例外）。
export function parseShoppingSyncRecord(input: unknown): ShoppingSyncRecord {
	const record = v.parse(recordSchema, input);

	if (record.deleted) {
		return record;
	}

	const parsed = parseLiveRecord(record.kind, record.id, record.data);

	if (shoppingRecordIdOf(parsed) !== record.id) {
		throw new Error("同期する行の ID が、中身と合いません");
	}

	return parsed;
}

function parseLiveRecord(
	kind: ShoppingRecordKind,
	id: string,
	data: unknown,
): Extract<ShoppingSyncRecord, { deleted: false }> {
	switch (kind) {
		case "item":
			return {
				kind,
				id,
				deleted: false,
				data: v.parse(dataSchemas.item, data),
			};
		case "store":
			return {
				kind,
				id,
				deleted: false,
				data: v.parse(dataSchemas.store, data),
			};
		case "branch":
			return {
				kind,
				id,
				deleted: false,
				data: v.parse(dataSchemas.branch, data),
			};
		case "storeDefault":
			return {
				kind,
				id,
				deleted: false,
				data: v.parse(dataSchemas.storeDefault, data),
			};
		case "conversionMemory":
			return {
				kind,
				id,
				deleted: false,
				data: v.parse(dataSchemas.conversionMemory, data),
			};
	}
}
