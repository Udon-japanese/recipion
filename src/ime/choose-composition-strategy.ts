// 変換中（IME の入力中）の補完の扱い。
// - end-then-replace：変換を確定させてから、確定した文字を含めて、置き換える（Mac・Windows の Chrome・Edge）
// - replace-in-place：変換中のまま、本文を書き換える。ブラウザが変換を取り消す（Mac の Safari、Android の Chrome。Android は、フォーカスを外すと、ソフトウェアキーボードが閉じるため）
// - wait-for-confirmation：変換中は、補完を出さない。確定したあとに出す（iPhone・Firefox・未確認の環境）
export type CompositionStrategy =
	| "end-then-replace"
	| "replace-in-place"
	| "wait-for-confirmation";

export type BrowserEnvironment = {
	userAgent: string;
	maxTouchPoints: number;
	// `navigator.userAgentData` のブランドに、Chromium があるか。
	isChromium: boolean;
};

// 実機で動作を確認できた環境だけを、変換中に補完する（Mac・Windows の Chromium 系、Android の Chrome、Mac の Safari）。Linux の Chromium 系を含む、ほかは、確定後に補完する。
export function chooseCompositionStrategy(
	environment: BrowserEnvironment,
): CompositionStrategy {
	const { userAgent, maxTouchPoints, isChromium } = environment;

	if (isChromium) {
		if (/Android/u.test(userAgent)) {
			return "replace-in-place";
		}

		// Linux の IME は、動作を確認できていない。
		return /Macintosh|Windows/u.test(userAgent)
			? "end-then-replace"
			: "wait-for-confirmation";
	}

	// iPhone・iPad（iPad は、Mac と同じ名前で名乗ることがあるので、タッチ画面で見分ける）は、iOS のすべてのブラウザが、同じエンジンで、実機で未確認。
	const isIos =
		/iPhone|iPad|iPod/u.test(userAgent) ||
		(/Macintosh/u.test(userAgent) && maxTouchPoints > 1);
	const isSafari =
		/Safari\//u.test(userAgent) &&
		!/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Android/u.test(userAgent);

	if (isSafari && !isIos) {
		return "replace-in-place";
	}

	return "wait-for-confirmation";
}
