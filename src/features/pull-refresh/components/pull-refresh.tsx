import { useEffect, useRef, useState } from "react";
import { Mascot } from "#/components/mascot/mascot";
import {
	indicatorOffsetPx,
	PULL_LEAVE_MS,
	PULL_MIN_LOADING_MS,
	PULL_THRESHOLD_PX,
	pullDistance,
	rollAngleDeg,
	shouldRefresh,
} from "../domain/pull-refresh-physics";
import * as styles from "./pull-refresh.css";

// 引っ張り更新（ブラウザ標準の代わり）。ページの一番上で下に引くと、mascot の丸が転がりながら降りてくる。
// - 途中で離したら、逆回転しながら上に戻る。
// - しきい値まで引いて離したら、丸を止めて mascot が跳ね続け、更新が終わるまで待つ（最低の表示時間あり）。
//   終わったら、逆回転しながら上に戻る。
// 指の動きは window で受け、ページの一番上で、下向きに引いたときだけ始める（スクロール中・ダイアログの中では始めない）。
// 標準の引っ張り更新は、styles.css の overscroll-behavior-y で止めている。
// 指の操作は、ページの描画と同じ流れの中で扱う（DOM の値は読まず、タッチの座標だけを使う）。

type Phase = "idle" | "pulling" | "loading" | "leaving";

// 白丸の中の mascot の大きさ（px）。丸（48px）に対して小さめにして、中で跳ねられるようにする。
const MASCOT_SIZE_PX = 20;

// ダイアログ（シート・モーダル）の中の指の動きでは、引っ張り更新を始めない。
const dialogSelector = '[role="dialog"], [aria-modal="true"]';

type PullRefreshProps = {
	// 更新の中身。失敗しても、丸は必ず戻す（例外は握りつぶす）。
	onRefresh: () => Promise<unknown>;
};

export function PullRefresh({ onRefresh }: PullRefreshProps) {
	const [phase, setPhase] = useState<Phase>("idle");
	const [distance, setDistance] = useState(0);
	const onRefreshRef = useRef(onRefresh);

	useEffect(() => {
		onRefreshRef.current = onRefresh;
	}, [onRefresh]);

	useEffect(() => {
		// 指の追跡（描画に使わない値は、再描画を起こさないように ref ではなくローカルに持つ）。
		let startY: number | null = null;
		let current = 0;
		// 更新の最中・戻る途中は、新しい引っ張りを受け付けない。
		let busy = false;
		let leaveTimer: number | undefined;

		const show = (next: number) => {
			current = next;
			setDistance(next);
		};

		const onTouchStart = (event: TouchEvent) => {
			const touch = event.touches[0];

			startY =
				!busy &&
				event.touches.length === 1 &&
				touch &&
				canStartPull(event.target)
					? touch.clientY
					: null;
		};

		const onTouchMove = (event: TouchEvent) => {
			const touch = event.touches[0];

			if (startY === null || !touch) {
				return;
			}

			const deltaY = touch.clientY - startY;

			if (deltaY > 0) {
				// 標準のスクロールを、引っ張っている間は止める。
				if (event.cancelable) {
					event.preventDefault();
				}

				setPhase("pulling");
			} else {
				setPhase("idle");
			}

			show(pullDistance(deltaY));
		};

		const onTouchEnd = () => {
			if (startY === null) {
				return;
			}

			startY = null;

			if (!shouldRefresh(current)) {
				setPhase("idle");
				show(0);

				return;
			}

			busy = true;
			setPhase("loading");
			show(PULL_THRESHOLD_PX);

			const minWait = new Promise<void>((resolve) => {
				window.setTimeout(resolve, PULL_MIN_LOADING_MS);
			});

			void Promise.all([onRefreshRef.current(), minWait])
				.catch(() => undefined)
				.finally(() => {
					setPhase("leaving");
					show(0);
					leaveTimer = window.setTimeout(() => {
						busy = false;
						setPhase("idle");
					}, PULL_LEAVE_MS);
				});
		};

		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd, { passive: true });
		window.addEventListener("touchcancel", onTouchEnd, { passive: true });

		return () => {
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
			window.removeEventListener("touchcancel", onTouchEnd);
			window.clearTimeout(leaveTimer);
		};
	}, []);

	const loading = phase === "loading";

	return (
		<div
			aria-hidden="true"
			className={styles.indicator}
			style={{
				opacity: phase === "idle" && distance === 0 ? 0 : 1,
				transform: `translate3d(-50%, ${indicatorOffsetPx(distance)}px, 0) rotate(${indicatorAngle(phase, distance)}deg)`,
				// 指で引いている間は、指に遅れずについてくる（遅れると、ずれて見える）。離したあとは、なめらかに動く。
				transition:
					phase === "pulling"
						? "none"
						: "transform 360ms ease-out, opacity 200ms ease-out",
			}}
		>
			{/* ふだんは白丸の中央に止まり、読み込み中は Button と同じく中で跳ね回る。
			    止まっているときの位置は、動く範囲（roam）の中心になるため、roam を分けて、中央に合わせる。
			    状態が変わるたびに作り直して、止まる位置を初期化する。 */}
			<Mascot
				key={loading ? "loop" : "still"}
				size={MASCOT_SIZE_PX}
				motion={loading ? "loop" : "still"}
				roam={loading ? 1 : 0.01}
			/>
		</div>
	);
}

// 丸の角度。読み込み中は起こしたまま跳ねさせ、戻るときは 1 回転ぶん逆に回す（見た目は起きたまま）。
function indicatorAngle(phase: Phase, distance: number): number {
	if (phase === "loading") {
		return 0;
	}

	if (phase === "leaving") {
		return -360;
	}

	return rollAngleDeg(distance);
}

// 引っ張りを始めてよいか。ページの一番上で、ダイアログの中ではなく、スクロールしている要素の中でもないとき。
function canStartPull(target: EventTarget | null): boolean {
	if ((document.scrollingElement?.scrollTop ?? 0) > 0) {
		return false;
	}

	if (!(target instanceof Element) || target.closest(dialogSelector)) {
		return false;
	}

	for (
		let element: Element | null = target;
		element;
		element = element.parentElement
	) {
		if (element.scrollTop > 0) {
			return false;
		}
	}

	return true;
}
