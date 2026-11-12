import { useEffect, useState } from "react";
import { formatShoppingClock } from "../domain/format-shopping-clock";
import * as styles from "./shopping-page.css";

// 買い物メモの、いまの日時（期限を気にするものを買うとき用）。分の変わり目と、画面に戻ってきたときに書き換える。
// サーバーで作る骨組みには出さない（端末の時刻と食い違わないように、読み込んだあとに出す）。
export function ShoppingClock() {
	const [now, setNow] = useState<Date | null>(null);

	useEffect(() => {
		let timer: number | undefined;

		function tick() {
			const current = new Date();

			setNow(current);
			window.clearTimeout(timer);
			// 次の分の変わり目に、もう一度。
			timer = window.setTimeout(
				tick,
				60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()),
			);
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				tick();
			}
		}

		tick();
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			window.clearTimeout(timer);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	if (!now) {
		return null;
	}

	return (
		<time className={styles.clock} dateTime={now.toISOString()}>
			{formatShoppingClock(now)}
		</time>
	);
}
