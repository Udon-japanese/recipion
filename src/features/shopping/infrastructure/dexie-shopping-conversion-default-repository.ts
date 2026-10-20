import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingConversionDefaultRepository } from "../application/shopping-conversion-default-repository";
import { toConversionMemoryKey } from "../domain/shopping-conversion-default";

export const dexieShoppingConversionDefaultRepository = {
	async list() {
		const records =
			await getLocalDatabase().shoppingConversionMemories.toArray();

		return Object.fromEntries(records.map(({ key, ...entry }) => [key, entry]));
	},

	async set(entry) {
		await getLocalDatabase().shoppingConversionMemories.put({
			key: toConversionMemoryKey(entry.nameKey, entry.unitLabel),
			...entry,
		});
	},
} satisfies ShoppingConversionDefaultRepository;
