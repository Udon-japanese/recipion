import type { ReactNode } from "react";
import type { IconName } from "../icon/icon-definitions";
import type { ToastTone } from "./toast";

// 画面の上に出る、短いお知らせ（読み込み中・完了・元に戻す など）。
// 状態は React の外に持つ（どの画面・部品からでも出せて、出した部品が消えても、お知らせは残る）。
// 失敗・直す操作が要るもの・説明は、お知らせにせず、その場の Note に出す。

export type ToastInput = {
	// 同じ id で出し直すと、その場で中身を差し替える（「同期しています…」→「反映しました」）。省略すると新しく作る。
	id?: string;
	message: ReactNode;
	// 見た目。省略すると、操作つきは dark、処理中は info、それ以外は success。
	tone?: ToastTone;
	// 文の前のアイコン（完了の check など）。
	icon?: IconName;
	// 処理中（回るアイコンを出す）。
	spinning?: boolean;
	// 右に置く操作（「元に戻す」「メモを見る」など）。押すと、お知らせは消える。
	action?: ToastAction;
	// 自動で消えるまでの時間（ミリ秒）。null は、消さない（処理中。終わったら、同じ id で出し直すか、dismissToast で消す）。
	// 省略すると、操作つきは 8 秒、それ以外は 3 秒。
	duration?: number | null;
};

export type ToastAction = {
	label: string;
	icon?: IconName;
	onClick: () => void;
};

export type Toast = Required<Pick<ToastInput, "id" | "message" | "tone">> &
	Pick<ToastInput, "icon" | "spinning" | "action"> & {
		duration: number | null;
		// 出し直すたびに増える（消えるまでの時間を、数え直す）。
		version: number;
		// 消える動きの途中。
		leaving: boolean;
	};

export const TOAST_DURATION_MS = 3000;
export const TOAST_ACTION_DURATION_MS = 8000;
// 一度に出すのは、ここまで（あふれたら、古いものから消す）。
export const MAX_TOASTS = 3;

let toasts: readonly Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit(next: readonly Toast[]) {
	toasts = next;

	for (const listener of listeners) {
		listener();
	}
}

export function subscribeToasts(listener: () => void): () => void {
	listeners.add(listener);

	return () => listeners.delete(listener);
}

export function getToasts(): readonly Toast[] {
	return toasts;
}

/** お知らせを出す（同じ id があれば、差し替える）。出したお知らせの id を返す。 */
export function showToast(input: ToastInput): string {
	nextId += 1;

	const id = input.id ?? `toast-${nextId}`;
	const current = toasts.find((toast) => toast.id === id);
	const toast: Toast = {
		id,
		message: input.message,
		tone:
			input.tone ??
			(input.action ? "dark" : input.spinning ? "info" : "success"),
		icon: input.icon,
		spinning: input.spinning,
		action: input.action,
		duration:
			input.duration === undefined
				? input.action
					? TOAST_ACTION_DURATION_MS
					: TOAST_DURATION_MS
				: input.duration,
		version: (current?.version ?? 0) + 1,
		leaving: false,
	};

	const next = current
		? toasts.map((item) => (item.id === id ? toast : item))
		: [...toasts, toast];
	const shown = next.filter((item) => !item.leaving);
	const overflow = new Set(
		shown
			.slice(0, Math.max(0, shown.length - MAX_TOASTS))
			.map((item) => item.id),
	);

	emit(
		next.map((item) =>
			overflow.has(item.id) ? { ...item, leaving: true } : item,
		),
	);

	return id;
}

/** お知らせを消す（上へ消える動きのあとで、なくなる）。 */
export function dismissToast(id: string): void {
	if (!toasts.some((toast) => toast.id === id && !toast.leaving)) {
		return;
	}

	emit(
		toasts.map((toast) =>
			toast.id === id ? { ...toast, leaving: true } : toast,
		),
	);
}

/** 処理中（消えない）お知らせなら、消す。出した部品が画面から外れるとき、処理中のまま残らないように呼ぶ。 */
export function dismissPendingToast(id: string): void {
	if (toasts.some((toast) => toast.id === id && toast.duration === null)) {
		dismissToast(id);
	}
}

/** 消える動きを終えたお知らせを、取り除く（ToastViewport が呼ぶ）。 */
export function removeToast(id: string): void {
	if (!toasts.some((toast) => toast.id === id)) {
		return;
	}

	emit(toasts.filter((toast) => toast.id !== id));
}

/** テスト用：すべて消す。 */
export function resetToastsForTest(): void {
	emit([]);
}
