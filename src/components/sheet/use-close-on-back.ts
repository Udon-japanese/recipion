import { useEffect, useRef } from "react";

// タッチ端末で、戻る操作で、重なって出ているもの（シート・モーダル・確認・メニュー）を閉じる。
// 開いている数だけ、履歴を積む（中身は今のページの写しに、深さ __overlayDepth を足したもの）。
//
// ルーター（@tanstack/history）には知らせない：
// - window.history.pushState はルーターが上書きしていて、呼ぶと router.load() が走る
//   （defaultStaleReloadMode: "blocking" なので、読み直しを待つあいだ、画面が読み込み中に変わる）。
//   上書きされていない History.prototype.pushState で積む。
// - 積んだ履歴の間の popstate は、ルーターより先に受けて、ルーターに渡さない
//   （同じページの写しなので、ルーターのキー __TSR_key が同じ。ルーターが作る履歴は、毎回キーが変わる）。
//   window の受け手は、capture でも登録した順に呼ばれる（Chromium で確認）ので、
//   ルーターを作る前に installCloseOnBack を呼ぶ（router.tsx）。

type Entry = { onBack: () => void };

type OverlayState = {
	__TSR_key?: string;
	__overlayDepth?: number;
};

// 開いている順（あとに開いたものが上）。
const stack: Entry[] = [];
// 今のページの上に積んだ数。
let depth = 0;
// 積んだページのキー。
let baseKey: string | undefined;
// 自分で戻している途中（その popstate では、何も閉じない）。
let traversing = false;
let installed = false;
let timer: number | undefined;

function readState(): OverlayState {
	const state: unknown = window.history.state;

	return typeof state === "object" && state !== null ? state : {};
}

function handlePopState(event: PopStateEvent) {
	const state = readState();
	const nextDepth = state.__overlayDepth ?? 0;

	if (baseKey !== undefined && state.__TSR_key === baseKey) {
		event.stopImmediatePropagation();
		depth = nextDepth;

		if (traversing) {
			traversing = false;
		} else {
			// 戻った分、上から閉じる。閉じなかったもの（必ず選ぶ確認など）は、突き合わせで積み直す。
			for (const entry of stack.slice(nextDepth).reverse()) {
				entry.onBack();
			}
		}

		reconcileSoon();

		return;
	}

	// ページの移動（ルーターが受ける）。閉じると同時に移ったときの、残った履歴に着いたら、すぐ飛ばす。
	traversing = false;
	baseKey = nextDepth > 0 ? state.__TSR_key : undefined;
	depth = nextDepth;
	reconcileSoon();
}

// 開いている数と、積んだ数を合わせる。
// 同じ操作の中のページの移動（ルーターの書き込みは、マイクロタスクのあと）を待ってから見る。
function reconcile() {
	if (traversing) {
		return;
	}

	const state = readState();

	// 閉じると同時に、ページが移った：積んだ履歴は、前のページに残して、数え直す。
	if (baseKey !== undefined && state.__TSR_key !== baseKey) {
		baseKey = undefined;
		depth = 0;
	}

	const desired = stack.length;

	if (desired > depth) {
		baseKey = state.__TSR_key;

		for (let next = depth + 1; next <= desired; next += 1) {
			History.prototype.pushState.call(
				window.history,
				{ ...state, __overlayDepth: next },
				"",
			);
		}

		depth = desired;
	} else if (desired < depth) {
		traversing = true;
		window.history.go(desired - depth);
	}
}

function reconcileSoon() {
	window.clearTimeout(timer);
	timer = window.setTimeout(reconcile, 0);
}

// ルーターを作る前に、1度だけ呼ぶ。
export function installCloseOnBack() {
	if (installed || typeof window === "undefined") {
		return;
	}

	installed = true;
	window.addEventListener("popstate", handlePopState);

	// 積んだ履歴の上で、再読み込みされた：その分を飛ばす。
	const state = readState();

	if (state.__overlayDepth) {
		baseKey = state.__TSR_key;
		depth = state.__overlayDepth;
	}
}

// open のあいだ、戻る操作で onBack を呼ぶ。onBack がないときは、戻っても閉じない（ページも戻らない）。
// タッチ端末（主な入力が指）だけ。PC では、何もしない。
export function useCloseOnBack(
	open: boolean,
	onBack: (() => void) | undefined,
) {
	const onBackRef = useRef(onBack);
	onBackRef.current = onBack;

	useEffect(() => {
		if (
			!open ||
			!installed ||
			typeof window.matchMedia !== "function" ||
			!window.matchMedia("(pointer: coarse)").matches
		) {
			return;
		}

		const entry: Entry = { onBack: () => onBackRef.current?.() };

		stack.push(entry);
		reconcileSoon();

		return () => {
			stack.splice(stack.indexOf(entry), 1);
			reconcileSoon();
		};
	}, [open]);
}
