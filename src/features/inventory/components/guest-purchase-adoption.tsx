import { useEffect, useState } from "react";
import { Button } from "#/components/button/button";
import { Card } from "#/components/card/card";
import { Note } from "#/components/note/note";

import type { AdoptGuestInventoryPurchasesResult } from "../application/adopt-guest-inventory-purchases";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
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

	if (status === "adopting") {
		return (
			<Note tone="info" spinning>
				ゲスト購入を引き継いでいます…
			</Note>
		);
	}

	if (status === "adopted") {
		return <Note tone="success">ゲスト購入を引き継ぎ、在庫へ反映しました</Note>;
	}

	if (status === "waiting") {
		return (
			<Note tone="neutral">
				ゲスト購入を引き継ぎました。在庫への反映は通信復旧後に再試行します
			</Note>
		);
	}

	if (status === "error") {
		return (
			<Note tone="error">ゲスト購入の確認または引き継ぎに失敗しました</Note>
		);
	}

	return (
		<Card padding="md">
			<div className={styles.container}>
				<div>
					<p className={styles.title}>ゲスト購入を引き継ぎますか？</p>
					<p className={styles.message}>
						未反映の購入が
						{guestPurchaseCount}件あります。
					</p>
				</div>

				<div className={styles.actions}>
					<Button variant="secondary" onClick={() => setIsDismissed(true)}>
						今回は引き継がない
					</Button>

					<Button onClick={() => void handleAdopt()}>
						このアカウントへ引き継ぐ
					</Button>
				</div>
			</div>
		</Card>
	);
}
