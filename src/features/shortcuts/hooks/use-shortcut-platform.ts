import { useSyncExternalStore } from "react";
import {
	chooseShortcutPlatform,
	type ShortcutPlatform,
} from "../domain/format-shortcut";

type NavigatorWithPlatform = Navigator & {
	userAgentData?: { platform?: string };
};

function noSubscription() {
	// プラットフォームは、途中で変わらない。
	return () => {};
}

function readPlatform(): ShortcutPlatform {
	return chooseShortcutPlatform({
		userAgent: navigator.userAgent,
		userAgentDataPlatform:
			(navigator as NavigatorWithPlatform).userAgentData?.platform ?? "",
	});
}

// 今のブラウザの OS（ショートカットの表記用）。サーバーでは分からないので、Windows 系で描画して、ブラウザで切り替える（描画の不一致を起こさない）。
export function useShortcutPlatform(): ShortcutPlatform {
	return useSyncExternalStore(noSubscription, readPlatform, () => "other");
}
