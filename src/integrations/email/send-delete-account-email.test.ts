import { describe, expect, it, vi } from "vitest";
import {
	renderDeleteAccountEmail,
	sendDeleteAccountEmail,
} from "./send-delete-account-email";

describe("sendDeleteAccountEmail", () => {
	it("リンクと、取り消せないこと・有効時間・心当たりがない場合を、本文に書く", () => {
		const { subject, text } = renderDeleteAccountEmail("https://x.test/a?b=1");

		expect(subject).toContain("アカウントの削除");
		expect(text).toContain("https://x.test/a?b=1");
		expect(text).toContain("取り消せません");
		expect(text).toContain("60分間");
		expect(text).toContain("心当たりがない場合");
	});

	it("失敗したときは、状態コードだけを伝える（本文は出さない）", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("secret body", { status: 500 }),
		);

		await expect(
			sendDeleteAccountEmail(
				{ to: "a@example.com", url: "https://x.test", from: "f", apiKey: "k" },
				fetchImpl,
			),
		).rejects.toThrow("500");
		await expect(
			sendDeleteAccountEmail(
				{ to: "a@example.com", url: "https://x.test", from: "f", apiKey: "k" },
				fetchImpl,
			),
		).rejects.not.toThrow("secret body");
	});
});
