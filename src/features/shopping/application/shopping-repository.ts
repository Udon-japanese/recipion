import type { ShoppingItem } from "../domain/shopping-item";

export interface ShoppingRepository {
	list(): Promise<ShoppingItem[]>;
	findById(id: string): Promise<ShoppingItem | undefined>;
	save(item: ShoppingItem): Promise<void>;
	saveAll(items: readonly ShoppingItem[]): Promise<void>;
	remove(id: string): Promise<void>;
	// 保存先の変更（別のタブ・画面の外からの書き込みを含む）を受け取る。最初に、いまの一覧が届く。
	// 返り値は、購読をやめる関数。なくてもよい（その場合、画面は自分の操作だけを反映する）。
	watch?(
		onChange: (items: ShoppingItem[]) => void,
		onError: (error: unknown) => void,
	): () => void;
}
