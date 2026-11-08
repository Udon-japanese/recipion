// アプリのインストールの案内を、どの形で出すか。
// prompt：ブラウザのインストールの確認を出せる（Chromium 系の beforeinstallprompt）。
// ios：iPhone・iPad。ページからは始められないため、「共有 → ホーム画面に追加」の手順を出す。
// none：出さない（アプリとして開いている、または、どちらにも当てはまらない）。
export type InstallGuide = "prompt" | "ios" | "none";

export type InstallEnvironment = {
	// アプリとして開いているか（display-mode: standalone、または iOS の navigator.standalone）。
	standalone: boolean;
	// beforeinstallprompt を受け取って、取ってあるか。
	promptAvailable: boolean;
	userAgent: string;
	maxTouchPoints: number;
};

// iPadOS の Safari は、Mac と同じ UA を名乗るため、タッチの点数で見分ける。
export function isAppleTouchDevice(userAgent: string, maxTouchPoints: number) {
	return (
		/iPhone|iPad|iPod/.test(userAgent) ||
		(userAgent.includes("Macintosh") && maxTouchPoints > 1)
	);
}

export function decideInstallGuide(env: InstallEnvironment): InstallGuide {
	if (env.standalone) {
		return "none";
	}

	if (env.promptAvailable) {
		return "prompt";
	}

	return isAppleTouchDevice(env.userAgent, env.maxTouchPoints) ? "ios" : "none";
}
