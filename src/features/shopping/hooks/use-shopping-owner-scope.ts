import { useEffect } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import { useStorageItem } from "#/local-storage/use-storage-item";
import { resolveShoppingOwnerScope } from "../domain/resolve-shopping-owner-scope";
import { signedInOwnerStorage } from "../infrastructure/signed-in-owner-storage";

// 買い物メモの持ち主（だれのメモを見せるか）。ログイン状態を読んでいる間は null。
// オフラインでログイン状態を確かめられないときは、この端末でいまログインしている人のメモを見せる。
export function useShoppingOwnerScope(): InventoryPurchaseOwnerScope | null {
	const { data, isPending, isUnconfirmed } = useAppSession();
	const [signedInOwner, setSignedInOwner] =
		useStorageItem(signedInOwnerStorage);
	const userId = data?.user.id ?? null;
	const resolved = resolveShoppingOwnerScope({
		isPending,
		userId,
		isUnconfirmed,
		signedInOwner,
	});

	useEffect(() => {
		if (
			resolved.remember !== undefined &&
			resolved.remember !== signedInOwner
		) {
			setSignedInOwner(resolved.remember);
		}
	}, [resolved.remember, signedInOwner, setSignedInOwner]);

	return resolved.ownerScope;
}
