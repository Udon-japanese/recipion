import { useEffect, useState } from "react";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";
import {
	dismissPendingToast,
	dismissToast,
	showToast,
} from "#/components/toast/toast-store";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { ShoppingMemoAdoption } from "../domain/plan-shopping-memo-adoption";
import {
	adoptGuestShoppingMemo,
	type GuestShoppingMemoState,
	watchGuestShoppingMemo,
} from "../infrastructure/dexie-guest-shopping-adoption";

type UserScope = Extract<InventoryPurchaseOwnerScope, `user:${string}`>;

type GuestShoppingMemoAdoptionProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	watchGuestMemo?: typeof watchGuestShoppingMemo;
	adoptGuestMemo?: (ownerScope: UserScope) => Promise<ShoppingMemoAdoption>;
};

const adoptionToastId = "guest-shopping-memo-adoption";

type AdoptionStatus = "idle" | "adopting" | "adopted" | "error";

function isUserScope(
	ownerScope: InventoryPurchaseOwnerScope | null,
): ownerScope is UserScope {
	return ownerScope !== null && ownerScope !== "guest";
}

// ログインしたとき、ログインする前（ゲスト）の買い物メモがあれば、このアカウントのメモに移すかを聞く。
// ゲストの購入の送信待ちがある間は、聞かない（在庫に入れるかの確認が先。片づいたら聞く）。
// 「今回は移さない」は、この画面の間だけ（ゲストのメモは、ログアウトすると、また見える）。
export function GuestShoppingMemoAdoption({
	ownerScope,
	watchGuestMemo = watchGuestShoppingMemo,
	adoptGuestMemo = adoptGuestShoppingMemo,
}: GuestShoppingMemoAdoptionProps) {
	const [guestMemo, setGuestMemo] = useState<GuestShoppingMemoState | null>(
		null,
	);
	const [status, setStatus] = useState<AdoptionStatus>("idle");
	const [isDismissed, setIsDismissed] = useState(false);
	const isUser = isUserScope(ownerScope);

	useEffect(() => {
		if (!isUser) {
			setGuestMemo(null);

			return;
		}

		return watchGuestMemo(setGuestMemo, () => setGuestMemo(null));
	}, [isUser, watchGuestMemo]);

	async function adopt() {
		if (!isUserScope(ownerScope)) {
			return;
		}

		setStatus("adopting");

		try {
			await adoptGuestMemo(ownerScope);
			setStatus("adopted");
		} catch {
			setStatus("error");
		}
	}

	// 移している間と、移したことは、画面の上のお知らせで伝える。
	useEffect(() => {
		if (status === "adopting") {
			showToast({
				id: adoptionToastId,
				message: "ログインする前の買い物メモを移しています…",
				spinning: true,
				duration: null,
			});
		} else if (status === "adopted") {
			showToast({
				id: adoptionToastId,
				message: "ログインする前の買い物メモを移しました",
				icon: "check",
			});
		} else {
			dismissToast(adoptionToastId);
		}
	}, [status]);

	// 画面を離れたら、処理中のお知らせは消す。
	useEffect(() => () => dismissPendingToast(adoptionToastId), []);

	if (!isUser || status === "adopting" || status === "adopted") {
		return null;
	}

	if (status === "error") {
		return (
			<Note tone="error">ログインする前の買い物メモを移せませんでした</Note>
		);
	}

	if (
		guestMemo === null ||
		!guestMemo.hasMemo ||
		guestMemo.hasPendingGuestPurchases ||
		isDismissed
	) {
		return null;
	}

	return (
		<ConfirmDialog
			open
			title="ログインする前の買い物メモを移しますか"
			cancelLabel="今回は移さない"
			confirmLabel="移す"
			onCancel={() => setIsDismissed(true)}
			onConfirm={() => void adopt()}
		>
			{guestMemo.pendingItemCount > 0
				? `ログインする前に書いた買い物メモ（まだ買っていない${guestMemo.pendingItemCount}件と、店・条件つきのメモ）を、このアカウントのメモに移します。`
				: "ログインする前に作った店・条件つきのメモを、このアカウントのメモに移します。"}
			同じ名前の店は、1つにまとめます。
		</ConfirmDialog>
	);
}
