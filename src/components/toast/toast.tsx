import type { ReactNode } from "react";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import * as styles from "./toast.css";

type ToastProps = {
	children: ReactNode;
	// 右の操作（「元に戻す」など）。
	action?: { label: string; icon?: IconName; onClick: () => void };
};

// 操作の結果の、短い知らせ（暗い丸薬）。取り消せる操作には、「元に戻す」を添える。
export function Toast({ children, action }: ToastProps) {
	return (
		<output className={styles.toast}>
			<span>{children}</span>
			{action ? (
				<button
					className={styles.action}
					type="button"
					onClick={action.onClick}
				>
					<Icon name={action.icon ?? "undo"} size={16} />
					{action.label}
				</button>
			) : null}
		</output>
	);
}
