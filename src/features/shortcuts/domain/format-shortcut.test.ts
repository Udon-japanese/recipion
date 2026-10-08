import { describe, expect, it } from "vitest";
import {
	chooseShortcutPlatform,
	formatShortcut,
	type ShortcutPlatform,
} from "./format-shortcut";

describe("formatShortcut", () => {
	it("OS と表記のスタイルごとに、ショートカットの表記を作る", () => {
		const cases: [
			string,
			ShortcutPlatform,
			"name" | "symbol",
			string[],
			string,
		][] = [
			[
				"Apple・キー名（既定）",
				"apple",
				"name",
				["alt", "up-down"],
				"Option+↑↓",
			],
			[
				"Apple・キー名",
				"apple",
				"name",
				["mod", "shift", "z"],
				"Command+Shift+Z",
			],
			["Apple・キー名", "apple", "name", ["enter"], "Return"],
			["Apple・記号", "apple", "symbol", ["alt", "up-down"], "⌥↑↓"],
			["Apple・記号", "apple", "symbol", ["mod", "tab"], "⌘⇥"],
			["Windows など", "other", "name", ["alt", "up-down"], "Alt+↑↓"],
			["Windows など", "other", "name", ["mod", "shift", "z"], "Ctrl+Shift+Z"],
			["Windows など", "other", "name", ["tab"], "Tab"],
			[
				"Windows など（記号の指定は、効かない）",
				"other",
				"symbol",
				["enter"],
				"Enter",
			],
		];
		const actual = cases.map(([, platform, appleStyle, keys]) =>
			formatShortcut(keys, { platform, appleStyle }),
		);

		expect(actual).toEqual(cases.map(([, , , , expected]) => expected));
	});

	it("スタイルを指定しないと、Apple 系も、キー名で表示する", () => {
		expect(formatShortcut(["alt", "up"], { platform: "apple" })).toBe(
			"Option+↑",
		);
	});
});

describe("chooseShortcutPlatform", () => {
	it("ブラウザの情報から、Apple 系かどうかを決める", () => {
		const mac =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
		const iphone =
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
		const windows =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
		const android =
			"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36";

		expect(
			chooseShortcutPlatform({ userAgent: mac, userAgentDataPlatform: "" }),
		).toBe("apple");
		expect(
			chooseShortcutPlatform({ userAgent: "", userAgentDataPlatform: "macOS" }),
		).toBe("apple");
		expect(
			chooseShortcutPlatform({ userAgent: iphone, userAgentDataPlatform: "" }),
		).toBe("apple");
		expect(
			chooseShortcutPlatform({
				userAgent: windows,
				userAgentDataPlatform: "Windows",
			}),
		).toBe("other");
		expect(
			chooseShortcutPlatform({
				userAgent: android,
				userAgentDataPlatform: "Android",
			}),
		).toBe("other");
		expect(
			chooseShortcutPlatform({ userAgent: "", userAgentDataPlatform: "" }),
		).toBe("other");
	});
});
