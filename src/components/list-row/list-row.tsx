import type { ComponentProps, ReactNode } from "react";
import * as styles from "./list-row.css";

type ListRowProps = Omit<
	ComponentProps<"li">,
	"className" | "style" | "children"
> & {
	// 先頭（チェックボックスなど）。
	leading?: ReactNode;
	// 後ろの操作（アイコンボタンなど）。
	actions?: ReactNode;
	// 並べ替えで持ち上げているとき。
	dragging?: boolean;
	// 名前と、その下の補足（札・チップなど）。
	children: ReactNode;
};

// 一覧の 1 行（先頭にチェック、中央に名前と補足、後ろに操作）。カードの中に並べる。
export function ListRow({
	leading,
	actions,
	dragging,
	children,
	...rest
}: ListRowProps) {
	return (
		<li {...rest} className={styles.row} data-dragging={dragging || undefined}>
			{leading}
			<div className={styles.main}>{children}</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</li>
	);
}

// 名前（16px・太め）。完了すると、取り消し線と薄い色。
export function ListRowName({
	done,
	children,
}: {
	done?: boolean;
	children: ReactNode;
}) {
	return (
		<span className={done ? styles.nameDone : styles.name}>{children}</span>
	);
}

// 名前の下の補足の並び（数量・店・状態）。
export function ListRowMeta({ children }: { children: ReactNode }) {
	return <div className={styles.meta}>{children}</div>;
}
