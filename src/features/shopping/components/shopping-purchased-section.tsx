import { type ReactNode, useId, useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Icon } from "#/components/icon/icon";
import type { ShoppingItem } from "../domain/shopping-item";
import * as styles from "./shopping-page.css";

type ShoppingPurchasedSectionProps = {
	items: readonly ShoppingItem[];
	// 1 項目の行（購入済みの行。1つずつ削除できる）。
	renderItem: (item: ShoppingItem) => ReactNode;
	// 購入済みを、すべて削除する。
	onClear: (items: readonly ShoppingItem[]) => Promise<void>;
};

// 購入済みの項目を、1か所にまとめる。普段は閉じていて、開くと1つずつ削除できる。閉じたままでも、一括で削除できる。
export function ShoppingPurchasedSection({
	items,
	renderItem,
	onClear,
}: ShoppingPurchasedSectionProps) {
	const listId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isClearing, setIsClearing] = useState(false);

	if (items.length === 0) {
		return null;
	}

	async function clear() {
		setIsClearing(true);

		try {
			await onClear(items);
		} finally {
			setIsClearing(false);
			setIsConfirming(false);
		}
	}

	return (
		<section className={styles.purchasedSection}>
			<div className={styles.purchasedHeader}>
				<button
					className={styles.purchasedToggle}
					type="button"
					aria-expanded={isOpen}
					aria-controls={listId}
					onClick={() => setIsOpen((current) => !current)}
				>
					<span className={styles.purchasedChevron} data-open={isOpen}>
						<Icon name="chevron-right" size={20} />
					</span>
					購入済み
					<span className={styles.purchasedCount}>{items.length}</span>
				</button>

				<Button
					variant="ghost"
					size="sm"
					aria-label={`購入済み${items.length}件をすべて削除`}
					onClick={() => setIsConfirming(true)}
				>
					すべて削除
				</Button>
			</div>

			{isOpen ? (
				<ul className={styles.listCard} id={listId}>
					{items.map((item) => renderItem(item))}
				</ul>
			) : null}

			<ConfirmDialog
				open={isConfirming}
				title="購入済みをすべて削除しますか？"
				cancelLabel="やめる"
				confirmLabel="すべて削除する"
				danger
				pending={isClearing}
				onCancel={() => setIsConfirming(false)}
				onConfirm={() => void clear()}
			>
				購入済みの{items.length}
				件を、買い物メモから削除します。在庫には影響しません。
			</ConfirmDialog>
		</section>
	);
}
