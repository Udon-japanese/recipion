import { useSortable } from "@dnd-kit/react/sortable";
import clsx from "clsx";
import type { ReactNode } from "react";
import * as styles from "./shopping-list.css";

type SortableShoppingItemProps = {
	id: string;
	index: number;
	className: string;
	disabled: boolean;
	children: (
		handleRef: ReturnType<typeof useSortable>["handleRef"],
	) => ReactNode;
};

// ドラッグで並び替えられる、一覧の 1 行。
export function SortableShoppingItem({
	id,
	index,
	className,
	disabled,
	children,
}: SortableShoppingItemProps) {
	const { ref, handleRef, isDragging } = useSortable({
		id,
		index,
		disabled,
	});

	return (
		<li
			className={clsx(className, isDragging && styles.draggingItem)}
			ref={ref}
		>
			{children(handleRef)}
		</li>
	);
}

export type DragHandleRef = ReturnType<typeof useSortable>["handleRef"];
