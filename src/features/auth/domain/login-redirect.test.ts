import { describe, expect, it } from "vitest";
import { toSafeRedirectPath } from "./login-redirect";

describe("toSafeRedirectPath", () => {
	it.each([
		["/recipes/abc", "/recipes/abc"],
		["/recipes/abc?n=2", "/recipes/abc?n=2"],
		// フラグメント（限定公開の合言葉など）は、戻り先に持ち越さない
		["/recipes/abc#p=x", "/recipes/abc"],
	])("アプリの中のパスは、受け付ける（%s）", (value, expected) => {
		expect(toSafeRedirectPath(value)).toBe(expected);
	});

	it.each([
		undefined,
		"",
		"recipes/abc",
		"https://example.com/",
		"//example.com/",
		"/\\example.com/",
		"javascript:alert(1)",
		"/login",
		"/login?redirect=/recipes/abc",
	])("外のサイト・相対パス・ログイン自身は、断る（%s）", (value) => {
		expect(toSafeRedirectPath(value)).toBeUndefined();
	});
});
