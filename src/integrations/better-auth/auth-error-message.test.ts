import { describe, expect, it } from "vitest";
import {
	AUTH_RATE_LIMITED_CODE,
	getAuthErrorMessage,
} from "./auth-error-message";

describe("getAuthErrorMessage", () => {
	it("既知のコードは、対応する日本語の文にする", () => {
		expect(getAuthErrorMessage({ code: "INVALID_OTP" })).toBe(
			"コードが正しくありません。",
		);
		expect(getAuthErrorMessage({ code: "OTP_EXPIRED" })).toContain("再送");
		expect(getAuthErrorMessage({ code: "TOO_MANY_ATTEMPTS" })).toContain(
			"再送",
		);
		expect(getAuthErrorMessage({ code: "VERIFICATION_FAILED" })).toContain(
			"ボット",
		);
	});

	it("レート制限は、コードでも、429 の状態でも、同じ文にする", () => {
		const byCode = getAuthErrorMessage({ code: AUTH_RATE_LIMITED_CODE });

		expect(byCode).toContain("しばらく待って");
		expect(getAuthErrorMessage({ status: 429 })).toBe(byCode);
	});

	it("未知のエラーは、内部のメッセージを出さず、一般的な文にする", () => {
		const message = getAuthErrorMessage({
			code: "SOMETHING_ELSE",
			message: "internal detail",
		});

		expect(message).not.toContain("internal detail");
		expect(message).toContain("もう一度");
		expect(getAuthErrorMessage(null)).toBe(message);
	});
});
