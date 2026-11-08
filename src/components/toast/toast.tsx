import type { ReactNode } from "react";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import * as styles from "./toast.css";

export type ToastTone = "dark" | "info" | "success";

type ToastProps = {
	children: ReactNode;
	// dark：暗い丸薬（「元に戻す」を添える結果）／info：読み込み中・同期中／success：終わった。既定は dark。
	tone?: ToastTone;
	// 文の前のアイコン。
	icon?: IconName;
	// 処理中（回るアイコン）。
	spinning?: boolean;
	// 右の操作（「元に戻す」など）。
	action?: { label: string; icon?: IconName; onClick: () => void };
};

// 操作の結果の、短い知らせ（暗い丸薬）。取り消せる操作には、「元に戻す」を添える。
// 画面の上に出すときは、showToast（toast-store.ts）を使う。
export function Toast({
	children,
	tone = "dark",
	icon,
	spinning = false,
	action,
}: ToastProps) {
	return (
		<output
			className={styles.toast}
			data-tone={tone}
			data-has-action={action ? "" : undefined}
		>
			{spinning || icon ? (
				<span className={styles.icon} aria-hidden="true">
					<span className={styles.glyph} data-spinning={spinning || undefined}>
						<Icon name={spinning ? "sync" : (icon ?? "check")} size={20} />
					</span>
				</span>
			) : null}
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
