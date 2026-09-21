export type ShoppingItemPreset = {
	quantity: number;
	unitLabel: string;
};

const eggPresets = [
	{ quantity: 6, unitLabel: "個" },
	{ quantity: 10, unitLabel: "個" },
] satisfies readonly ShoppingItemPreset[];

const presetsByItemName: Readonly<
	Record<string, readonly ShoppingItemPreset[]>
> = {
	卵: eggPresets,
	たまご: eggPresets,
	タマゴ: eggPresets,
	玉子: eggPresets,
};

export function getShoppingItemPresets(
	itemName: string,
): readonly ShoppingItemPreset[] {
	return presetsByItemName[itemName.trim()] ?? [];
}
