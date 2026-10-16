import type {
	ShoppingBranch,
	ShoppingBranchSide,
} from "../domain/shopping-branch";
import type { ShoppingItem } from "../domain/shopping-item";

export interface ShoppingBranchRepository {
	list(): Promise<ShoppingBranch[]>;
	// 分岐の一覧の変更を受け取る（最初に、いまの一覧が届く）。返り値は、購読をやめる関数。
	watch?(
		onChange: (branches: ShoppingBranch[]) => void,
		onError: (error: unknown) => void,
	): () => void;
	// 分岐と、条件の材料を、まとめて保存する。
	create(branch: ShoppingBranch, conditionItem: ShoppingItem): Promise<void>;
	// 分岐の条件・呼び名を保存する。
	update(branch: ShoppingBranch): Promise<void>;
	// 分岐を消す。中の項目もすべて消す。
	remove(branchId: string): Promise<void>;
	// 側の呼び名（thenLabel / elseLabel）を保存する。
	setSideLabel(
		branchId: string,
		side: ShoppingBranchSide,
		label: string | null,
	): Promise<void>;
	// 条件が決まったとき。選んだ側を通常の項目にして保存し、選ばなかった側と分岐を消す（1つの処理で）。
	applyDecision(
		branchId: string,
		released: readonly ShoppingItem[],
		discardedIds: readonly string[],
	): Promise<void>;
}
