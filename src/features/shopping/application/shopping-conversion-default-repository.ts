import type {
	ShoppingConversionDefaults,
	ShoppingConversionEntry,
} from "../domain/shopping-conversion-default";

export interface ShoppingConversionDefaultRepository {
	// 記憶のキー（食材×単位）→ 記憶。
	list(): Promise<ShoppingConversionDefaults>;
	// 同じ食材×単位の記憶は、置き換える。
	set(entry: ShoppingConversionEntry): Promise<void>;
}
