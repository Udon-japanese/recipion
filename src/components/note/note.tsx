import type { ReactNode } from "react";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import type { NoteTone } from "./note.css";
import * as styles from "./note.css";

type NoteProps = {
	// neutral：灰色（オフラインなど）／info：薄い黄色（同期中など）／warn：橙／success：緑／error：赤。
	tone?: NoteTone;
	// 省略すると、種類に合うアイコン。
	icon?: IconName;
	// アイコンを回す（同期中・読み込み中）。
	spinning?: boolean;
	// 右に置く操作（「再試行」など）。
	action?: ReactNode;
	children: ReactNode;
};

const defaultIcons: Record<NoteTone, IconName> = {
	neutral: "info-circle",
	info: "info-circle",
	warn: "alert-triangle",
	success: "check",
	error: "alert-triangle",
};

// 状態・結果のお知らせ（アイコン＋色＋文）。エラーは、読み上げで、すぐに伝わる（role="alert"）。
export function Note({
	tone = "neutral",
	icon,
	spinning = false,
	action,
	children,
}: NoteProps) {
	const content = (
		<>
			<span
				className={styles.icon({ tone })}
				data-spinning={spinning || undefined}
			>
				<Icon
					name={spinning ? "sync" : (icon ?? defaultIcons[tone])}
					size={20}
				/>
			</span>
			<span className={styles.text}>{children}</span>
			{action}
		</>
	);

	return tone === "error" ? (
		<div className={styles.note({ tone })} role="alert">
			{content}
		</div>
	) : (
		<output className={styles.note({ tone })}>{content}</output>
	);
}
