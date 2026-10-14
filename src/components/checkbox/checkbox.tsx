import type { ComponentProps } from "react";
import { Icon } from "../icon/icon";
import * as styles from "./checkbox.css";

type CheckboxProps = Omit<
	ComponentProps<"input">,
	"type" | "className" | "style" | "aria-label"
> & {
	// 読み上げる名前（必須。例：「トマトをチェック」）。
	label: string;
};

// チェックボックス。見た目は 24px・押せる範囲は 44px。チェックは、黄色の地＋濃い枠＋✓（色だけに頼らない）。
export function Checkbox({ label, ...rest }: CheckboxProps) {
	return (
		<span className={styles.root}>
			<input
				{...rest}
				className={styles.input}
				type="checkbox"
				aria-label={label}
			/>
			<span className={styles.box} aria-hidden="true">
				<span className={styles.mark}>
					<Icon name="check" size={16} />
				</span>
			</span>
		</span>
	);
}
