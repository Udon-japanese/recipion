// ショートカットの表記を、OS ごとに切り替える（純粋な関数）。
// キーは、OS に依らない抽象的な名前で指定する。

// Apple 系（Mac・iPhone・iPad）か、それ以外（Windows・Linux など）か。
export type ShortcutPlatform = "apple" | "other";

// Apple 系の表記。name：キー名（Command・Option）、symbol：記号（⌘・⌥）。
// 記号は分かりにくいので、既定は、キー名。将来、設定で選べるようにする。
export type AppleKeyStyle = "name" | "symbol";

// mod：Mac は Command、ほかは Ctrl。up-down：上下の矢印を、まとめて示す。
export type NamedShortcutKey =
	| "mod"
	| "alt"
	| "ctrl"
	| "shift"
	| "tab"
	| "enter"
	| "esc"
	| "up"
	| "down"
	| "left"
	| "right"
	| "up-down"
	| "left-right";

// 名前のないキー（"Z" や "1" など）は、そのまま表示する。
export type ShortcutKey = NamedShortcutKey | (string & {});

type KeyLabels = { name: string; symbol: string };

// 記号は、Unicode のエスケープで書く（見た目の取り違えを避けるため）。
const appleLabels: Record<string, KeyLabels> = {
	mod: { name: "Command", symbol: "⌘" }, // ⌘
	alt: { name: "Option", symbol: "⌥" }, // ⌥
	ctrl: { name: "Control", symbol: "⌃" }, // ⌃
	shift: { name: "Shift", symbol: "⇧" }, // ⇧
	tab: { name: "Tab", symbol: "⇥" }, // ⇥
	enter: { name: "Return", symbol: "↩" }, // ↩
	esc: { name: "Esc", symbol: "⎋" }, // ⎋
};

const otherLabels: Record<string, string> = {
	mod: "Ctrl",
	alt: "Alt",
	ctrl: "Ctrl",
	shift: "Shift",
	tab: "Tab",
	enter: "Enter",
	esc: "Esc",
};

// 矢印は、どの OS でも同じ（↑ ↑、↓ ↓、← ←、→ →）。
const arrowLabels: Record<string, string> = {
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	"up-down": "↑↓",
	"left-right": "←→",
};

export type FormatShortcutOptions = {
	platform: ShortcutPlatform;
	appleStyle?: AppleKeyStyle;
};

// 1つのキーの表記。
export function formatShortcutKey(
	key: ShortcutKey,
	{ platform, appleStyle = "name" }: FormatShortcutOptions,
): string {
	const arrow = arrowLabels[key];

	if (arrow !== undefined) {
		return arrow;
	}

	if (platform === "apple") {
		const labels = appleLabels[key];

		return labels ? labels[appleStyle] : key.toUpperCase();
	}

	return otherLabels[key] ?? key.toUpperCase();
}

// 記号は詰めて（⌥↑↓）、キー名は + でつなぐ（Option+↑↓、Alt+↑↓）。
export function formatShortcut(
	keys: readonly ShortcutKey[],
	options: FormatShortcutOptions,
): string {
	const labels = keys.map((key) => formatShortcutKey(key, options));
	const isSymbol =
		options.platform === "apple" && options.appleStyle === "symbol";

	return labels.join(isSymbol ? "" : "+");
}

// キーを区切る文字（記号のときは、区切らない）。
export function getShortcutSeparator(options: FormatShortcutOptions): string {
	return options.platform === "apple" && options.appleStyle === "symbol"
		? ""
		: "+";
}

type PlatformSource = {
	userAgent: string;
	// `navigator.userAgentData.platform`（なければ空）。
	userAgentDataPlatform: string;
};

// ブラウザの情報から、プラットフォームを決める。iPhone・iPad も、Apple 系（外付けキーボードの表記）。
export function chooseShortcutPlatform({
	userAgent,
	userAgentDataPlatform,
}: PlatformSource): ShortcutPlatform {
	if (/mac|ios/iu.test(userAgentDataPlatform)) {
		return "apple";
	}

	return /Macintosh|iPhone|iPad|iPod/u.test(userAgent) ? "apple" : "other";
}
