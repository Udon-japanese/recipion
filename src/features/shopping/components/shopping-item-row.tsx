import clsx from "clsx";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import {
	getShoppingItemConvertedQuantityLabel,
	type ShoppingItem,
} from "../domain/shopping-item";
import type { ShoppingItemMoveDirection } from "../domain/shopping-item-order";
import * as styles from "./shopping-list.css";
import type { DragHandleRef } from "./sortable-shopping-item";

type ShoppingItemRowProps = {
	item: ShoppingItem;
	// 並び替えができる表示（売り場順）のときだけ、渡す。
	dragHandleRef?: DragHandleRef;
	// 買う店の名前（売り場順の表示で、店を示す）。
	storeName?: string;
	isFirst: boolean;
	isLast: boolean;
	isReordering: boolean;
	onToggle: (item: ShoppingItem) => void;
	onMove: (itemId: string, direction: ShoppingItemMoveDirection) => void;
	onStartEditing: (item: ShoppingItem) => void;
	onRemove: (itemId: string) => void;
};

// 一覧の 1 行（チェック・名前・数量・並び替え・編集・削除）。
export function ShoppingItemRow({
	item,
	dragHandleRef,
	storeName,
	isFirst,
	isLast,
	isReordering,
	onToggle,
	onMove,
	onStartEditing,
	onRemove,
}: ShoppingItemRowProps) {
	const isPurchased = item.status === "purchased";
	const isChecked = item.status === "checked" || isPurchased;
	const convertedQuantityLabel = getShoppingItemConvertedQuantityLabel(item);

	return (
		<>
			{dragHandleRef ? (
				<button
					className={styles.dragHandle}
					type="button"
					ref={dragHandleRef}
					aria-label={`${item.name}をドラッグして並び替え`}
					disabled={isReordering}
				>
					⠿
				</button>
			) : null}
			<input
				className={styles.checkbox}
				type="checkbox"
				checked={isChecked}
				disabled={isPurchased}
				aria-label={`${item.name}をチェック`}
				onChange={() => onToggle(item)}
			/>

			<span
				className={clsx(styles.itemName, isChecked && styles.checkedItemName)}
			>
				{item.name}
				<span className={styles.quantity}>
					{formatQuantityForUnit(item.quantity, item.unitLabel)}
					{item.unitLabel}

					{convertedQuantityLabel ? (
						<span className={styles.convertedQuantity}>
							（{convertedQuantityLabel}）
						</span>
					) : null}
				</span>

				{storeName ? (
					<span className={styles.storeLabel}>{storeName}</span>
				) : null}

				{isPurchased ? (
					<span className={styles.purchasedLabel}>購入済み</span>
				) : null}
			</span>

			<div className={styles.itemActions}>
				{dragHandleRef ? (
					<>
						<button
							className={styles.moveButton}
							type="button"
							aria-label={`${item.name}を上へ`}
							disabled={isFirst || isReordering}
							onClick={() => onMove(item.id, "up")}
						>
							↑
						</button>

						<button
							className={styles.moveButton}
							type="button"
							aria-label={`${item.name}を下へ`}
							disabled={isLast || isReordering}
							onClick={() => onMove(item.id, "down")}
						>
							↓
						</button>
					</>
				) : null}

				<button
					className={styles.editButton}
					type="button"
					onClick={() => onStartEditing(item)}
				>
					編集
				</button>

				<button
					className={styles.deleteButton}
					type="button"
					aria-label={`${item.name}を削除`}
					onClick={() => onRemove(item.id)}
				>
					削除
				</button>
			</div>
		</>
	);
}
