import { afterEach, describe, expect, it } from "vitest";
import {
	stashSharedPassphrase,
	takeSharedPassphrase,
} from "./shared-passphrase-storage";

afterEach(() => {
	window.sessionStorage.clear();
	window.history.replaceState(null, "", "/");
});

describe("共有リンクのパスフレーズの預かり", () => {
	it("フラグメントのパスフレーズを、URL から消して、預ける。取り出しは1回だけ", () => {
		window.history.replaceState(null, "", "/recipes/abc?n=2#p=ねこりんご");

		expect(stashSharedPassphrase("abc")).toBe("ねこりんご");
		expect(window.location.hash).toBe("");
		expect(`${window.location.pathname}${window.location.search}`).toBe(
			"/recipes/abc?n=2",
		);

		// ログインして戻ってきた（フラグメントはない）
		expect(takeSharedPassphrase("abc")).toBe("ねこりんご");
		expect(takeSharedPassphrase("abc")).toBeNull();
	});

	it("フラグメントから、直接取り出せる（ログイン済みで開いたとき）", () => {
		window.history.replaceState(null, "", "/recipes/abc#p=ねこ");

		expect(takeSharedPassphrase("abc")).toBe("ねこ");
		expect(window.location.hash).toBe("");
		expect(takeSharedPassphrase("abc")).toBeNull();
	});

	it("別のレシピの分は、取り出さない", () => {
		window.history.replaceState(null, "", "/recipes/abc#p=ねこ");
		stashSharedPassphrase("abc");

		expect(takeSharedPassphrase("other")).toBeNull();
		expect(takeSharedPassphrase("abc")).toBe("ねこ");
	});

	it("フラグメントがなければ、何もしない", () => {
		window.history.replaceState(null, "", "/recipes/abc");

		expect(stashSharedPassphrase("abc")).toBeNull();
		expect(takeSharedPassphrase("abc")).toBeNull();
	});
});
