import {
	KeyboardSensor,
	PointerActivationConstraints,
	PointerSensor,
} from "@dnd-kit/dom";
import { useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";
import { dragHandleHoldMs } from "#/components/icon-button/drag-handle-hold";

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

// ドラッグの始め方：マウス・ペンは、つかみを押して動かせばすぐ。指は、つかみを長押し（dragHandleHoldMs・5px 以内）してから。
// 指で、すぐに始めると、右手の親指でスクロールしたときに、右端のつかみに触れて、並べ替えが暴発する。
// 長押しの前に指が 5px より動いたら、ブラウザのスクロールになる（つかみの touch-action は、スクロールを許す）。
export const shoppingSortSensors = [
	PointerSensor.configure({
		activationConstraints: (event) =>
			event.pointerType === "touch"
				? [
						new PointerActivationConstraints.Delay({
							value: dragHandleHoldMs,
							tolerance: 5,
						}),
					]
				: undefined,
	}),
	KeyboardSensor,
];
