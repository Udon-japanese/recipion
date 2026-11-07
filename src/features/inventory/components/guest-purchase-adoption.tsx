import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";

import type { AdoptGuestInventoryPurchasesResult } from "../application/adopt-guest-inventory-purchases";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import { isPurchaseOutboxSynced } from "../application/sync-inventory-purchase-outbox";

type LoadGuestPurchaseCount = () => Promise<number>;

type AdoptGuestPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<AdoptGuestInventoryPurchasesResult>;

type GuestPurchaseAdoptionProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadGuestPurchaseCount: LoadGuestPurchaseCount;
	adoptGuestPurchases: AdoptGuestPurchases;
};

type AdoptionStatus =
	| "idle"
	| "checking"
	| "adopting"
	| "adopted"
	| "waiting"
	| "error";

// ログインしたとき、ログインする前（ゲスト）の購入があれば、このアカウントの在庫に入れるかを、毎回聞く。
// ゲストの購入は、ログアウトしたと確かめたあとの購入だけ（共用の端末なら、別の人の購入かもしれない）。
export function GuestPurchaseAdoption({
	ownerScope,
	loadGuestPurchaseCount,
	adoptGuestPurchases,
}: GuestPurchaseAdoptionProps) {
	const [guestPurchaseCount, setGuestPurchaseCount] = useState(0);
	const [status, setStatus] = useState<AdoptionStatus>("idle");
	const [isDismissed, setIsDismissed] = useState(false);
	// いまの所有者（引き継いでいる間に、ログアウト・別の人に変わったら、古い結果を出さない）。
	const currentScope = useRef(ownerScope);

	useEffect(() => {
		currentScope.current = ownerScope;
	}, [ownerScope]);

	const adopt = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			return;
		}

		setStatus("adopting");

		try {
			const result = await adoptGuestPurchases(ownerScope);

			if (currentScope.current !== ownerScope) {
				return;
			}

			setGuestPurchaseCount(0);

			if (result.syncResult && !isPurchaseOutboxSynced(result.syncResult)) {
				setStatus("waiting");
				return;
			}

			setStatus("adopted");
		} catch {
			if (currentScope.current === ownerScope) {
				setStatus("error");
			}
		}
	}, [ownerScope, adoptGuestPurchases]);

	useEffect(() => {
		let isActive = true;

		setIsDismissed(false);

		if (!ownerScope || ownerScope === "guest") {
			setGuestPurchaseCount(0);
			setStatus("idle");

			return () => {
				isActive = false;
			};
		}

		setStatus("checking");

		void loadGuestPurchaseCount()
			.then((count) => {
				if (!isActive) {
					return;
				}

				setGuestPurchaseCount(count);
				setStatus("idle");
			})
			.catch(() => {
				if (isActive) {
					setStatus("error");
				}
			});

		return () => {
			isActive = false;
		};
	}, [ownerScope, loadGuestPurchaseCount]);

	if (
		!ownerScope ||
		ownerScope === "guest" ||
		status === "checking" ||
		(status === "idle" && (guestPurchaseCount === 0 || isDismissed))
	) {
		return null;
	}

	if (status === "adopting") {
		return (
			<Note tone="info" spinning>
				ログインする前に買ったものを在庫に入れています…
			</Note>
		);
	}

	if (status === "adopted") {
		return (
			<Note tone="success">ログインする前に買ったものを在庫に入れました</Note>
		);
	}

	if (status === "waiting") {
		return (
			<Note tone="neutral">
				ログインする前に買ったものを受け取りました。在庫に入れられなかった分は、通信が戻ったときや、この画面に戻ったときに、もう一度送ります
			</Note>
		);
	}

	if (status === "error") {
		return (
			<Note tone="error">
				ログインする前に買ったものを在庫に入れられませんでした
			</Note>
		);
	}

	// 質問は、コーナーシートの確認。押すと閉じて、進行中・結果は、上の Note で出る。
	return (
		<ConfirmDialog
			open
			title="ログインする前に買ったものを在庫に入れますか"
			cancelLabel="今回は入れない"
			confirmLabel="在庫に入れる"
			onCancel={() => setIsDismissed(true)}
			onConfirm={() => void adopt()}
		>
			買い物メモで買ったもの（{guestPurchaseCount}
			件）をこのアカウントの在庫に入れます。
		</ConfirmDialog>
	);
}
