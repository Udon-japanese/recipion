import type { ShoppingBranch } from "../domain/shopping-branch";
import type { ShoppingItem } from "../domain/shopping-item";

export interface ShoppingBranchRepository {
	list(): Promise<ShoppingBranch[]>;
	// 分岐と、条件の材料を、まとめて保存する。
	create(branch: ShoppingBranch, conditionItem: ShoppingItem): Promise<void>;
	// 分岐を消す。中の項目もすべて消す。
	remove(branchId: string): Promise<void>;
	// 条件が決まったとき。選んだ側を通常の項目にして保存し、選ばなかった側と分岐を消す（1つの処理で）。
	applyDecision(
		branchId: string,
		released: readonly ShoppingItem[],
		discardedIds: readonly string[],
	): Promise<void>;
}
