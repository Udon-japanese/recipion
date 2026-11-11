import { onTestFinished } from "vitest";
import { cdp } from "vitest/browser";

const macChromeUserAgent =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// ブラウザのテストで、ブラウザを Mac の Chrome として名乗らせる（そのテストが終わったら、元に戻す）。
// 変換中の補完の方式は、ブラウザから判定する（Mac・Windows の Chromium 系だけ、変換中も候補を出す。Linux は確定してから）。
// 方式を受け取れない、部品を組み合わせた画面（追加シート・まとめて追加）のテストを、実行する環境（CI の Linux）によらず、Mac の Chrome として動かす。
// 方式を受け取れる部品（食材名の入力欄・レシピの本文）のテストは、compositionStrategy を渡す。
export async function emulateMacChrome(): Promise<void> {
	await cdp().send("Emulation.setUserAgentOverride", {
		userAgent: macChromeUserAgent,
		userAgentMetadata: {
			brands: [{ brand: "Chromium", version: "140" }],
			platform: "macOS",
			platformVersion: "15.0.0",
			architecture: "arm",
			model: "",
			mobile: false,
		},
	});
	// 空にすると、ブラウザ本来の名乗りに戻る。
	onTestFinished(async () => {
		await cdp().send("Emulation.setUserAgentOverride", { userAgent: "" });
	});
}
