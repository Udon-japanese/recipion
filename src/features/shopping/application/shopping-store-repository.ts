import type { ShoppingStore } from "../domain/shopping-store";

export interface ShoppingStoreRepository {
	list(): Promise<ShoppingStore[]>;
	save(store: ShoppingStore): Promise<void>;
	// 店を消す。その店の項目は「どこでも」に戻し、「いつも買う店」の記憶も消す。
	remove(id: string): Promise<void>;
	// 店の一覧の変更を受け取る（最初に、いまの一覧が届く）。返り値は、購読をやめる関数。
	watch?(
		onChange: (stores: ShoppingStore[]) => void,
		onError: (error: unknown) => void,
	): () => void;
	// 食材名のキー → 店の ID。
	listDefaults(): Promise<Record<string, string>>;
	// storeId が null なら、記憶を消す。
	setDefault(nameKey: string, storeId: string | null): Promise<void>;
}
