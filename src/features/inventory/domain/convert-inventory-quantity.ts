import * as v from "valibot";

const quantitySchema = v.pipe(
	v.number(),
	v.finite("数量には有限の数値を指定してください"),
	v.gtValue(0, "数量は0より大きい数にしてください"),
);

const unitCodeSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "単位を指定してください"),
);

const conversionInputSchema = v.object({
	inputQuantity: quantitySchema,
	inputUnitCode: unitCodeSchema,
	stockUnitCode: unitCodeSchema,
	stockQuantityPerInputUnit: quantitySchema,
});

export type ConvertInventoryQuantityInput = v.InferInput<
	typeof conversionInputSchema
>;

export type ConvertedInventoryQuantity = {
	quantity: number;
	unitCode: string;
};

export function convertInventoryQuantity(
	input: ConvertInventoryQuantityInput,
): ConvertedInventoryQuantity {
	const parsedInput = v.parse(conversionInputSchema, input);
	const quantity = Number(
		(parsedInput.inputQuantity * parsedInput.stockQuantityPerInputUnit).toFixed(
			6,
		),
	);

	return {
		quantity,
		unitCode: parsedInput.stockUnitCode,
	};
}
