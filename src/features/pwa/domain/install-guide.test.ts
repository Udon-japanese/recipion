import { describe, expect, it } from "vitest";
import { decideInstallGuide, type InstallEnvironment } from "./install-guide";

const androidChrome =
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const iphoneSafari =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const macSafari =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const base: InstallEnvironment = {
	standalone: false,
	promptAvailable: false,
	userAgent: androidChrome,
	maxTouchPoints: 5,
};

describe("decideInstallGuide", () => {
	it.each<[string, Partial<InstallEnvironment>, string]>([
		["確認を出せるなら prompt", { promptAvailable: true }, "prompt"],
		[
			"アプリとして開いていれば、確認を出せても none",
			{ standalone: true, promptAvailable: true },
			"none",
		],
		["iPhone は手順の案内", { userAgent: iphoneSafari }, "ios"],
		[
			"iPadOS（Mac の UA ＋タッチ）も手順の案内",
			{ userAgent: macSafari, maxTouchPoints: 5 },
			"ios",
		],
		[
			"Mac（タッチなし）は none",
			{ userAgent: macSafari, maxTouchPoints: 0 },
			"none",
		],
		[
			"iPhone でも、アプリとして開いていれば none",
			{ userAgent: iphoneSafari, standalone: true },
			"none",
		],
		["確認を出せない Android は none", {}, "none"],
	])("%s", (_name, overrides, expected) => {
		expect(decideInstallGuide({ ...base, ...overrides })).toBe(expected);
	});
});
