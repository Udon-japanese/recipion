import { describe, expect, it } from "vitest";
import {
	type BrowserEnvironment,
	chooseCompositionStrategy,
} from "./choose-composition-strategy";

const macSafari =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const iPhoneSafari =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const iPhoneChrome =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1";
const firefox =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0";
const androidChrome =
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const chrome =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("chooseCompositionStrategy", () => {
	it("環境ごとに、変換中の補完の扱いを決める", () => {
		const cases: [string, BrowserEnvironment, string][] = [
			[
				"PC の Chromium 系",
				{ userAgent: chrome, maxTouchPoints: 0, isChromium: true },
				"end-then-replace",
			],
			[
				"Android の Chrome（フォーカスを外すと、キーボードが閉じる）",
				{ userAgent: androidChrome, maxTouchPoints: 5, isChromium: true },
				"replace-in-place",
			],
			[
				"Mac の Safari",
				{ userAgent: macSafari, maxTouchPoints: 0, isChromium: false },
				"replace-in-place",
			],
			[
				"iPhone の Safari",
				{ userAgent: iPhoneSafari, maxTouchPoints: 5, isChromium: false },
				"wait-for-confirmation",
			],
			[
				"iPhone の Chrome（中身は Safari と同じ）",
				{ userAgent: iPhoneChrome, maxTouchPoints: 5, isChromium: false },
				"wait-for-confirmation",
			],
			[
				"iPad（Mac と名乗る）",
				{ userAgent: macSafari, maxTouchPoints: 5, isChromium: false },
				"wait-for-confirmation",
			],
			[
				"Firefox",
				{ userAgent: firefox, maxTouchPoints: 0, isChromium: false },
				"wait-for-confirmation",
			],
			[
				"判定できない環境",
				{ userAgent: "", maxTouchPoints: 0, isChromium: false },
				"wait-for-confirmation",
			],
		];
		const actual = cases.map(([name, environment]) => [
			name,
			chooseCompositionStrategy(environment),
		]);

		expect(actual).toEqual(cases.map(([name, , expected]) => [name, expected]));
	});
});
