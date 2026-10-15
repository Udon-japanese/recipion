import { describe, expect, it, vi } from "vitest";
import { hideInternalError } from "./hide-internal-error";
import {
	describeError,
	GENERIC_ERROR_MESSAGE,
	UserFacingError,
} from "./user-facing-error";

describe("hideInternalError", () => {
	it("利用者向けのエラーは、そのまま通し、ログに残さない", () => {
		const log = vi.fn();
		const error = new UserFacingError("レシピが見つかりません");

		expect(hideInternalError(error, log)).toBe(error);
		expect(log).not.toHaveBeenCalled();
	});

	it("内部のエラーは、汎用文に替えて、原因をログに残す", () => {
		const log = vi.fn();
		const internal = new Error(
			'Failed query: select "x" from "recipe_link" params: abc',
		);
		const result = hideInternalError(internal, log);

		expect(result).toBeInstanceOf(UserFacingError);
		expect((result as Error).message).toBe(GENERIC_ERROR_MESSAGE);
		expect((result as Error).message).not.toContain("Failed query");
		expect(log).toHaveBeenCalledWith(expect.any(String), internal);
	});

	it("Error でないもの（redirect など）は、そのまま通す", () => {
		const redirect = new Response(null, { status: 302 });

		expect(hideInternalError(redirect, vi.fn())).toBe(redirect);
	});
});

describe("describeError", () => {
	it("日本語の文はそのまま、英語の文（ネットワークなど）は代わりの文にする", () => {
		expect(describeError(new Error("レシピが見つかりません"), "代わり")).toBe(
			"レシピが見つかりません",
		);
		expect(describeError(new TypeError("Failed to fetch"), "代わり")).toBe(
			"代わり",
		);
		expect(describeError("文字列", "代わり")).toBe("代わり");
		expect(describeError(undefined)).toBe(GENERIC_ERROR_MESSAGE);
	});
});
