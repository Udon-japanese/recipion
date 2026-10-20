import type { ShoppingConversionDefaultRepository } from "#/features/shopping/application/shopping-conversion-default-repository";
import {
	type ShoppingConversionDefaults,
	toConversionMemoryKey,
} from "#/features/shopping/domain/shopping-conversion-default";

export type FakeShoppingConversionDefaultRepository =
	ShoppingConversionDefaultRepository & {
		// いま保存されている記憶。結果の状態を確かめるのに使う。
		readonly defaults: ShoppingConversionDefaults;
	};

// メモリ上で本当に動く偽のリポジトリ。
export function createFakeShoppingConversionDefaultRepository(
	initial: ShoppingConversionDefaults = {},
): FakeShoppingConversionDefaultRepository {
	let stored: ShoppingConversionDefaults = { ...initial };

	return {
		get defaults() {
			return stored;
		},
		async list() {
			return { ...stored };
		},
		async set(entry) {
			stored = {
				...stored,
				[toConversionMemoryKey(entry.nameKey, entry.unitLabel)]: entry,
			};
		},
	};
}
