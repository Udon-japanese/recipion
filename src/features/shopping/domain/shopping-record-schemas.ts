import * as v from "valibot";
import type {
	ShoppingConversionMemoryRecord,
	ShoppingStoreDefault,
} from "#/local-db/database";
import {
	maxShoppingBranchConditionLength,
	maxShoppingBranchLabelLength,
	type ShoppingBranch,
} from "./shopping-branch";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
} from "./shopping-category";
import { inventoryConversionSchema, type ShoppingItem } from "./shopping-item";
import type { ShoppingItemMemory } from "./shopping-item-memory";
import {
	maxShoppingStoreNameLength,
	type ShoppingStore,
} from "./shopping-store";

// 買い物メモの6つの表の行の形（ファイルの書き出し・読み込みと、サーバーとの同期で共通に使う）。
export const shoppingRecordLimits = {
	// 1人の買い物メモの行の数（ファイルの読み込みと、サーバーとの同期で共通。店・条件つきメモは、画面の上限と同じ）。
	maxItems: 2000,
	maxStoreDefaults: 2000,
	maxConversionMemories: 2000,
	maxItemMemories: 2000,
	maxIdLength: 100,
	maxNameLength: 100,
	maxConversionMemoryKeyLength: 300,
} as const;

const idSchema = v.pipe(
	v.string(),
	v.minLength(1),
	v.maxLength(shoppingRecordLimits.maxIdLength),
);
const timestampSchema = v.pipe(v.string(), v.isoTimestamp());
const sortOrderSchema = v.pipe(v.number(), v.integer(), v.minValue(0));
const nameSchema = (maxLength: number) =>
	v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxLength));

export const shoppingStoreSchema = v.object({
	id: idSchema,
	name: nameSchema(maxShoppingStoreNameLength),
	sortOrder: sortOrderSchema,
	createdAt: timestampSchema,
}) satisfies v.GenericSchema<unknown, ShoppingStore>;

const branchLabelSchema = v.nullable(nameSchema(maxShoppingBranchLabelLength));

export const shoppingBranchSchema = v.object({
	id: idSchema,
	condition: nameSchema(maxShoppingBranchConditionLength),
	thenLabel: branchLabelSchema,
	elseLabel: branchLabelSchema,
	sortOrder: sortOrderSchema,
	createdAt: timestampSchema,
}) satisfies v.GenericSchema<unknown, ShoppingBranch>;

const unitLabelSchema = v.nullable(
	v.pipe(v.string(), v.maxLength(shoppingRecordLimits.maxNameLength)),
);

const categoryIdSchema = v.nullable(
	v.custom<ShoppingCategoryId>(
		(input) => typeof input === "string" && isShoppingCategoryId(input),
	),
);
const categoryAssignmentSchema = v.nullable(
	v.picklist(["automatic", "manual"]),
);
const usedAtSchema = v.pipe(v.number(), v.finite(), v.minValue(0));
const quantitySchema = v.pipe(v.number(), v.finite(), v.gtValue(0));

export const shoppingItemSchema = v.object({
	id: idSchema,
	name: nameSchema(shoppingRecordLimits.maxNameLength),
	quantity: quantitySchema,
	unitLabel: unitLabelSchema,
	inventoryConversion: v.nullable(inventoryConversionSchema),
	categoryId: categoryIdSchema,
	categoryAssignment: categoryAssignmentSchema,
	storeId: v.nullable(idSchema),
	branchId: v.nullable(idSchema),
	branchSide: v.nullable(v.picklist(["condition", "then", "else"])),
	status: v.picklist(["pending", "checked", "purchased"]),
	sortOrder: v.pipe(v.number(), v.finite()),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
}) satisfies v.GenericSchema<unknown, ShoppingItem>;

export const shoppingStoreDefaultSchema = v.object({
	nameKey: nameSchema(shoppingRecordLimits.maxNameLength),
	storeId: idSchema,
}) satisfies v.GenericSchema<unknown, ShoppingStoreDefault>;

export const shoppingConversionMemorySchema = v.object({
	key: v.pipe(
		v.string(),
		v.minLength(1),
		v.maxLength(shoppingRecordLimits.maxConversionMemoryKeyLength),
	),
	nameKey: nameSchema(shoppingRecordLimits.maxNameLength),
	unitLabel: unitLabelSchema,
	inventoryConversion: inventoryConversionSchema,
	quantity: v.optional(quantitySchema),
	usedAt: usedAtSchema,
}) satisfies v.GenericSchema<unknown, ShoppingConversionMemoryRecord>;

export const shoppingItemMemorySchema = v.object({
	nameKey: nameSchema(shoppingRecordLimits.maxNameLength),
	quantity: quantitySchema,
	unitLabel: unitLabelSchema,
	categoryId: categoryIdSchema,
	categoryAssignment: categoryAssignmentSchema,
	usedAt: usedAtSchema,
}) satisfies v.GenericSchema<unknown, ShoppingItemMemory>;
