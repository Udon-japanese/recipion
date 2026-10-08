// 変換中（IME の入力中）の補完の扱い。
// - end-then-replace：変換を確定させてから、確定した文字を含めて、置き換える（Chromium 系。PC の Chrome・Edge、Android の Chrome）
// - replace-in-place：変換中のまま、本文を書き換える。ブラウザが変換を取り消す（Mac の Safari）
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

// 実機で動作を確認できた環境だけを、変換中に補完する。ほかは、確定後に補完する。
export function chooseCompositionStrategy(
	environment: BrowserEnvironment,
): CompositionStrategy {
	const { userAgent, maxTouchPoints, isChromium } = environment;

	if (isChromium) {
		return "end-then-replace";
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
