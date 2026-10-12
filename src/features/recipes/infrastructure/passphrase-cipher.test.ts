import { describe, expect, it } from "vitest";
import { decryptPassphrase, encryptPassphrase } from "./passphrase-cipher";

describe("passphrase cipher", () => {
	it("暗号化して、同じ鍵で戻せる。毎回違う文字列になる", async () => {
		const a = await encryptPassphrase("ねこりんごやまくるま", "secret");
		const b = await encryptPassphrase("ねこりんごやまくるま", "secret");

		expect(a).not.toBe(b);
		expect(a).not.toContain("ねこ");
		expect(await decryptPassphrase(a, "secret")).toBe("ねこりんごやまくるま");
	});

	it("鍵が違う・壊れた・形が違うものは、null", async () => {
		const stored = await encryptPassphrase("ねこ", "secret");

		expect(await decryptPassphrase(stored, "other")).toBeNull();
		expect(await decryptPassphrase(`${stored}x`, "secret")).toBeNull();
		expect(await decryptPassphrase("v2.a.b", "secret")).toBeNull();
		expect(await decryptPassphrase("", "secret")).toBeNull();
	});
});
