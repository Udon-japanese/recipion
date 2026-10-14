import { useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";

export type DragHandleRef = ReturnType<typeof useSortable>["handleRef"];
type RowRef = ReturnType<typeof useSortable>["ref"];

type SortableShoppingItemProps = {
	id: string;
	// その分類の中での位置。
	index: number;
	disabled: boolean;
	children: (state: {
		rowRef: RowRef;
		handleRef: DragHandleRef;
		isDragging: boolean;
	}) => ReactNode;
};

// ドラッグで並び替えられる、一覧の 1 行（行の要素は、呼び出し側が作る）。
export function SortableShoppingItem({
	id,
	index,
	disabled,
	children,
}: SortableShoppingItemProps) {
	const { ref, handleRef, isDragging } = useSortable({
		id,
		index,
		disabled,
	});

	return children({ rowRef: ref, handleRef, isDragging });
}
