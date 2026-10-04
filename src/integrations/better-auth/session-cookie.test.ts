import { describe, expect, it } from "vitest";
import { hasSessionCookie } from "./session-cookie";

describe("hasSessionCookie", () => {
	it("セッション Cookie があれば、true（https の __Secure- 付きも）", () => {
		expect(hasSessionCookie("better-auth.session_token=abc.def")).toBe(true);
		expect(hasSessionCookie("__Secure-better-auth.session_token=abc.def")).toBe(
			true,
		);
		expect(
			hasSessionCookie("theme=dark; better-auth.session_token=abc; other=1"),
		).toBe(true);
	});

	it("Cookie がない、または別の Cookie だけなら、false", () => {
		expect(hasSessionCookie(null)).toBe(false);
		expect(hasSessionCookie(undefined)).toBe(false);
		expect(hasSessionCookie("")).toBe(false);
		expect(hasSessionCookie("theme=dark; other=1")).toBe(false);
	});

	it("似た名前や、空の値は、セッション Cookie とみなさない", () => {
		expect(hasSessionCookie("x-better-auth.session_token=abc")).toBe(false);
		expect(hasSessionCookie("better-auth.session_data=abc")).toBe(false);
		expect(hasSessionCookie("better-auth.session_token=")).toBe(false);
	});
});
