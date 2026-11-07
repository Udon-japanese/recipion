import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";

type UserScope = Extract<InventoryPurchaseOwnerScope, `user:${string}`>;

export type ShoppingOwnerInput = {
	// ログイン状態を、まだ読んでいる。
	isPending: boolean;
	// ログインしている人（確かめられた）。いなければ null。
	userId: string | null;
	// ログイン状態を、サーバーに確かめられなかった（通信できないなど）。
	isUnconfirmed: boolean;
	// この端末で、いまログインしている人の記憶。
	signedInOwner: UserScope | null;
};

export type ShoppingOwnerResolution = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	// 記憶を書き換えるとき（undefined は、そのまま）。
	remember?: UserScope | null;
};

// だれの買い物メモを見せるか。
// - ログインしている：その人（記憶する）。
// - 確かめられない：記憶している人がいれば、その人（オフラインの店先で、自分のメモが消えたように見せない）。
// - 未ログインと確かめた：ゲスト（記憶を消す。共用の端末で、前の人のメモを見せない）。
export function resolveShoppingOwnerScope(
	input: ShoppingOwnerInput,
): ShoppingOwnerResolution {
	if (input.isPending) {
		return { ownerScope: null };
	}

	if (input.userId !== null) {
		const ownerScope: UserScope = `user:${input.userId}`;

		return { ownerScope, remember: ownerScope };
	}

	if (input.isUnconfirmed) {
		return { ownerScope: input.signedInOwner ?? "guest" };
	}

	return { ownerScope: "guest", remember: null };
}
