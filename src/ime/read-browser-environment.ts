import type { BrowserEnvironment } from "./choose-composition-strategy";

type NavigatorWithBrands = Navigator & {
	userAgentData?: { brands?: { brand: string }[] };
};

// 今のブラウザの情報（サーバーでは、判定できない環境として返す）。
export function readBrowserEnvironment(): BrowserEnvironment {
	if (typeof navigator === "undefined") {
		return { userAgent: "", maxTouchPoints: 0, isChromium: false };
	}

	const brands = (navigator as NavigatorWithBrands).userAgentData?.brands;

	return {
		userAgent: navigator.userAgent,
		maxTouchPoints: navigator.maxTouchPoints ?? 0,
		isChromium: brands?.some(({ brand }) => brand === "Chromium") ?? false,
	};
}
