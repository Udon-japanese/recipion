import type {
	ShoppingConversionDefaults,
	ShoppingConversionEntry,
} from "../domain/shopping-conversion-default";

export interface ShoppingConversionDefaultRepository {
	// 記憶の鍵（ID）→ 記憶。
	list(): Promise<ShoppingConversionDefaults>;
	// その鍵の記憶を書く（同じ鍵があれば、置き換える）。
	set(key: string, entry: ShoppingConversionEntry): Promise<void>;
	// その鍵の記憶を消す。
	remove(keys: readonly string[]): Promise<void>;
}
