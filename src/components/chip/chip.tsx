import type { ComponentProps, ReactNode } from "react";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import * as styles from "./chip.css";

type ChipProps = Omit<ComponentProps<"button">, "className" | "style"> & {
	// 選べるチップのとき、選ばれているか（aria-pressed）。省略すると、ふつうのボタン。
	pressed?: boolean;
	icon?: IconName;
	// qty：数量の押しボタン（大きな数字）。
	size?: "md" | "qty";
	children: ReactNode;
};

// 押せる小さな部品（選択・数量・絞り込み）。枠がある＝押せる。選ばれていると、黄色の地＋濃い枠＋✓。
export function Chip({
	pressed,
	icon,
	size = "md",
	type = "button",
	children,
	...rest
}: ChipProps) {
	return (
		<button
			{...rest}
			className={styles.chip}
			type={type}
			aria-pressed={pressed}
			data-size={size}
		>
			{pressed ? (
				<Icon name="check" size={16} />
			) : icon ? (
				<Icon name={icon} size={16} />
			) : null}
			{children}
		</button>
	);
}

// チップを並べる枠。
export function ChipGroup({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<fieldset className={styles.group} aria-label={label}>
			{children}
		</fieldset>
	);
}

// 数量チップの単位（小さい文字）。
export function ChipUnit({ children }: { children: ReactNode }) {
	return <small className={styles.unit}>{children}</small>;
}
