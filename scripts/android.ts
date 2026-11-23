// デバッグ版の Android アプリを、エミュレーター（なければ起動する）か、つないだ実機に入れて開く。
import { execFileSync, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const sdk =
	process.env.ANDROID_HOME ?? join(homedir(), "Library", "Android", "sdk");
const adbPath = join(sdk, "platform-tools", "adb");
const emulatorPath = join(sdk, "emulator", "emulator");

function adb(...args: string[]): string {
	return execFileSync(adbPath, args, { encoding: "utf8" }).trim();
}

function connectedDevices(): string[] {
	return adb("devices")
		.split("\n")
		.slice(1)
		.filter((line) => line.endsWith("\tdevice"));
}

async function startEmulator() {
	const avd = execFileSync(emulatorPath, ["-list-avds"], { encoding: "utf8" })
		.split("\n")
		.map((line) => line.trim())
		.find((line) => line !== "");
	if (avd === undefined) {
		throw new Error(
			"エミュレーターがありません。Android Studio の Device Manager で作ってください。",
		);
	}
	console.log(`エミュレーター（${avd}）を起動します。`);
	spawn(emulatorPath, ["-avd", avd], { detached: true, stdio: "ignore" }).unref();
	adb("wait-for-device");
	while (adb("shell", "getprop", "sys.boot_completed") !== "1") {
		await sleep(1000);
	}
}

if (connectedDevices().length === 0) {
	await startEmulator();
}

// 開発サーバーは IPv6 の ::1 でだけ待つため、エミュレーターの 10.0.2.2 からは届かない。端末の localhost を手元に向ける。
// 端末を再起動すると消えるので、毎回かける。
adb("reverse", "tcp:3000", "tcp:3000");

const devServerUp = await fetch("http://localhost:3000/", {
	signal: AbortSignal.timeout(2000),
}).then(
	() => true,
	() => false,
);
if (!devServerUp) {
	console.warn("開発サーバーが動いていません。別のターミナルで `pnpm dev` を起動してください。");
}

execFileSync("./gradlew", [":androidApp:installDebug"], {
	cwd: join(import.meta.dirname, "..", "apps", "mobile"),
	stdio: "inherit",
});
adb("shell", "am", "start", "-n", "app.recipion.android/.MainActivity");
