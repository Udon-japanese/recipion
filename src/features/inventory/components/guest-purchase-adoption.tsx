import { useEffect, useState } from "react";

import type { AdoptGuestInventoryPurchasesResult } from "../application/adopt-guest-inventory-purchases";
import type { InventoryPurchaseOwnerScope } from "../infrastructure/inventory-purchase-outbox";
import * as styles from "./guest-purchase-adoption.css";

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

export function GuestPurchaseAdoption({
	ownerScope,
	loadGuestPurchaseCount,
	adoptGuestPurchases,
}: GuestPurchaseAdoptionProps) {
	const [guestPurchaseCount, setGuestPurchaseCount] = useState(0);
	const [status, setStatus] = useState<AdoptionStatus>("idle");
	const [isDismissed, setIsDismissed] = useState(false);

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

	async function handleAdopt() {
		if (!ownerScope || ownerScope === "guest") {
			return;
		}

		setStatus("adopting");

		try {
			const result = await adoptGuestPurchases(ownerScope);

			setGuestPurchaseCount(0);

			if (result.syncResult?.failedEntryId) {
				setStatus("waiting");
				return;
			}

			setStatus("adopted");
		} catch {
			setStatus("error");
		}
	}

	if (
		!ownerScope ||
		ownerScope === "guest" ||
		status === "checking" ||
		(status === "idle" && (guestPurchaseCount === 0 || isDismissed))
	) {
		return null;
	}

	return (
		<section className={styles.container} aria-live="polite">
			{status === "idle" && guestPurchaseCount > 0 ? (
				<>
					<div>
						<p className={styles.title}>ゲスト購入を引き継ぎますか？</p>
						<p className={styles.message}>
							未反映の購入が
							{guestPurchaseCount}件あります。
						</p>
					</div>

					<div className={styles.actions}>
						<button
							className={styles.secondaryButton}
							type="button"
							onClick={() => setIsDismissed(true)}
						>
							今回は引き継がない
						</button>

						<button
							className={styles.primaryButton}
							type="button"
							onClick={() => void handleAdopt()}
						>
							このアカウントへ引き継ぐ
						</button>
					</div>
				</>
			) : null}

			{status === "adopting" ? (
				<p className={styles.message}>ゲスト購入を引き継いでいます…</p>
			) : null}

			{status === "adopted" ? (
				<p className={styles.message}>
					ゲスト購入を引き継ぎ、在庫へ反映しました
				</p>
			) : null}

			{status === "waiting" ? (
				<p className={styles.message}>
					ゲスト購入を引き継ぎました。在庫への反映は通信復旧後に再試行します
				</p>
			) : null}

			{status === "error" ? (
				<p className={styles.error} role="alert">
					ゲスト購入の確認または引き継ぎに失敗しました
				</p>
			) : null}
		</section>
	);
}
