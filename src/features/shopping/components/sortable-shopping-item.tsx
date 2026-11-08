import { KeyboardSensor, PointerSensor } from "@dnd-kit/react";
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

// ドラッグの始め方は、dnd-kit の既定のまま：マウスは、つかみを押して動かせばすぐ。指は、つかみを少し長押し（250ms・5px 以内）してから。
// 指で、すぐに始めると、右手の親指でスクロールしたときに、右端のつかみに触れて、並べ替えが暴発する。
// 長押しの前に指が動いたら、ブラウザのスクロールになる（つかみの touch-action は、スクロールを許す）。
export const shoppingSortSensors = [PointerSensor, KeyboardSensor];
