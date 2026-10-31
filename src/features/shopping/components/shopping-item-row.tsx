import type { Ref } from "react";
import { Checkbox } from "#/components/checkbox/checkbox";
import { IconButton } from "#/components/icon-button/icon-button";
import {
	ListRow,
	ListRowMeta,
	ListRowName,
} from "#/components/list-row/list-row";
import { Menu, type MenuItem } from "#/components/menu/menu";
import { Tag } from "#/components/tag/tag";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import {
	getShoppingItemConvertedQuantityLabel,
	type ShoppingItem,
} from "../domain/shopping-item";
import type { ShoppingItemMoveDirection } from "../domain/shopping-item-order";
import * as styles from "./shopping-page.css";
import type { DragHandleRef } from "./sortable-shopping-item";

type ShoppingItemRowProps = {
	item: ShoppingItem;
	// 行の要素に付ける ref（並べ替えのため）。
	rowRef?: Ref<HTMLLIElement>;
	// 並び替えができる表示（一覧）のときだけ、渡す。
	dragHandleRef?: DragHandleRef;
	isDragging?: boolean;
	// 買う店の名前（一覧の表示で、店を示す）。
	storeName?: string;
	// 同じ分類の中での端。
	isFirst: boolean;
	isLast: boolean;
	isReordering: boolean;
	onToggle: (item: ShoppingItem) => void;
	onMove: (itemId: string, direction: ShoppingItemMoveDirection) => void;
	// 名前・数量・在庫への換算などを直す（編集のシート）。
	onStartEditing: (item: ShoppingItem) => void;
	onRemove: (itemId: string) => void;
};

// 一覧の 1 行（チェック・名前・数量と在庫での量・店・並べ替え・その他）。
// 数量・換算は、文字で見せるだけ（直すのは、「その他」の「編集」）。
export function ShoppingItemRow({
	item,
	rowRef,
	dragHandleRef,
	isDragging,
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

	const menuItems: MenuItem[] = [
		{
			label: "編集",
			icon: "edit",
			onSelect: () => onStartEditing(item),
		},
		...(dragHandleRef
			? ([
					{
						label: "上へ",
						icon: "arrow-up",
						disabled: isFirst || isReordering,
						onSelect: () => onMove(item.id, "up"),
					},
					{
						label: "下へ",
						icon: "arrow-down",
						disabled: isLast || isReordering,
						onSelect: () => onMove(item.id, "down"),
					},
				] satisfies MenuItem[])
			: []),
		{
			label: "削除",
			icon: "trash",
			tone: "danger",
			onSelect: () => onRemove(item.id),
		},
	];

	return (
		<ListRow
			ref={rowRef}
			dragging={isDragging}
			data-checked={isChecked || undefined}
			leading={
				<Checkbox
					label={`${item.name}をチェック`}
					checked={isChecked}
					disabled={isPurchased}
					onChange={() => onToggle(item)}
				/>
			}
			actions={
				<>
					{dragHandleRef ? (
						<IconButton
							ref={dragHandleRef as Ref<HTMLButtonElement>}
							icon="grip"
							label={`${item.name}を並べ替え`}
							tone="plain"
							dragHandle
							disabled={isReordering}
						/>
					) : null}

					<Menu
						label={`${item.name}のその他`}
						icon="more-horizontal"
						items={menuItems}
					/>
				</>
			}
		>
			<ListRowName done={isChecked}>{item.name}</ListRowName>

			<ListRowMeta>
				<span>
					{formatQuantityForUnit(item.quantity, item.unitLabel)}
					{item.unitLabel}
					{convertedQuantityLabel
						? `（${item.inventoryConversion?.isApproximate ? "約" : ""}${convertedQuantityLabel}）`
						: null}
				</span>

				<span className={styles.doneTags} data-done={isChecked}>
					{storeName ? <Tag icon="store">{storeName}</Tag> : null}
				</span>

				{isPurchased ? <Tag tone="success">購入済み</Tag> : null}
			</ListRowMeta>
		</ListRow>
	);
}
