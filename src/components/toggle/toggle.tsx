import type { ComponentProps } from "react";
import * as styles from "./toggle.css";

type ToggleProps = Omit<
	ComponentProps<"input">,
	| "type"
	| "role"
	| "className"
	| "style"
	| "aria-label"
	| "checked"
	| "defaultChecked"
	| "onChange"
> & {
	// 読み上げる名前（必須。例：「画面を消さない」）。
	label: string;
	// 状態は、呼ぶ側が持つ。
	checked: boolean;
	onChange: (checked: boolean) => void;
};

// 切り替えスイッチ（すぐに効く設定用。「保存」を押す入力には、チェックボックスを使う）。
export function Toggle({ label, checked, onChange, ...rest }: ToggleProps) {
	return (
		<span className={styles.root}>
			<input
				{...rest}
				className={styles.input}
				type="checkbox"
				role="switch"
				aria-label={label}
				aria-checked={checked}
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
			/>
			<span className={styles.track} aria-hidden="true">
				<span className={styles.thumb} />
			</span>
		</span>
	);
}
