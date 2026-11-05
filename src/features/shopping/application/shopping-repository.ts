import type { ShoppingItem } from "../domain/shopping-item";

export interface ShoppingRepository {
	list(): Promise<ShoppingItem[]>;
	findById(id: string): Promise<ShoppingItem | undefined>;
	save(item: ShoppingItem): Promise<void>;
	saveAll(items: readonly ShoppingItem[]): Promise<void>;
	// カテゴリが未判定の項目を、保存されている今の値から判定し直して保存する。
	// 画面の写しで上書きしないため、読み直しと保存は1つのまとまりで行う（消えた項目・判定済みの項目は触らない）。
	categorizeUnassigned(ids: readonly string[], now?: Date): Promise<void>;
	remove(id: string): Promise<void>;
	// まとめて消す（途中で失敗したら、どれも消さない）。
	removeAll(ids: readonly string[]): Promise<void>;
	// 保存先の変更（別のタブ・画面の外からの書き込みを含む）を受け取る。最初に、いまの一覧が届く。
	// 返り値は、購読をやめる関数。なくてもよい（その場合、画面は自分の操作だけを反映する）。
	watch?(
		onChange: (items: ShoppingItem[]) => void,
		onError: (error: unknown) => void,
	): () => void;
}
