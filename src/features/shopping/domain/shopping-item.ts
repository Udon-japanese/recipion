import * as v from "valibot";

export type ShoppingItemStatus = "pending" | "checked";

export type ShoppingItem = {
	id: string;
	name: string;
	quantity: number;
	unitLabel: string | null;
	status: ShoppingItemStatus;
	createdAt: string;
	updatedAt: string;
};

export const createShoppingItemInputSchema = v.object({
	name: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "商品名を入力してください"),
	),
	quantity: v.optional(
		v.pipe(
			v.number(),
			v.finite("数量には有限の数値を指定してください"),
			v.gtValue(0, "数量は0より大きい数にしてください"),
		),
	),
	unitLabel: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
});

export type CreateShoppingItemInput = v.InferInput<
	typeof createShoppingItemInputSchema
>;

export function createShoppingItem(
	input: CreateShoppingItemInput,
	now = new Date(),
): ShoppingItem {
	const parsedInput = v.parse(createShoppingItemInputSchema, input);
	const timestamp = now.toISOString();

	return {
		id: crypto.randomUUID(),
		name: parsedInput.name,
		quantity: parsedInput.quantity ?? 1,
		unitLabel: parsedInput.unitLabel || null,
		status: "pending",
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

export function toggleShoppingItem(
	item: ShoppingItem,
	now = new Date(),
): ShoppingItem {
	return {
		...item,
		status: item.status === "pending" ? "checked" : "pending",
		updatedAt: now.toISOString(),
	};
}
