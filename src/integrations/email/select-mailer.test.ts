import { describe, expect, it } from "vitest";
import { consoleMailer } from "./console-mailer";
import { selectMailer } from "./select-mailer";

describe("selectMailer", () => {
	it.each([
		{ resendApiKey: "re_key", isDevelopment: true, console: true },
		{ resendApiKey: undefined, isDevelopment: true, console: true },
		{ resendApiKey: "re_key", isDevelopment: false, console: false },
	])(
		"キー $resendApiKey・開発中 $isDevelopment なら、コンソールに出すのは $console",
		({ resendApiKey, isDevelopment, console }) => {
			const mailer = selectMailer({ resendApiKey, isDevelopment });

			expect(mailer === consoleMailer).toBe(console);
		},
	);

	it("本番でキーがなければ、送れないことをエラーにする", () => {
		expect(() =>
			selectMailer({ resendApiKey: undefined, isDevelopment: false }),
		).toThrow("RESEND_API_KEY");
	});
});
