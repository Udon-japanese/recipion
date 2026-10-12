import { describe, expect, it, vi } from "vitest";
import {
	renderAdminNotificationEmail,
	sendAdminNotificationEmail,
} from "./send-admin-notification-email";

describe("renderAdminNotificationEmail", () => {
	it("種類と件数とリンクだけを書く（投稿の中身は書かない）", () => {
		const { subject, text } = renderAdminNotificationEmail({
			kindLabel: "利用者からの通報",
			openCount: 3,
			url: "https://recipion.app/admin/reports",
		});

		expect(subject).toContain("利用者からの通報");
		expect(subject).toContain("未対応3件");
		expect(text).toContain("https://recipion.app/admin/reports");
		expect(text).toContain("30分に1通");
	});
});

describe("sendAdminNotificationEmail", () => {
	const input = {
		to: ["a@example.com", "b@example.com"],
		subject: "件名",
		text: "本文",
		from: "れしぴょん <login@recipion.app>",
		apiKey: "key",
	};

	it("すべての管理者を宛先にして、Resend に送る", async () => {
		const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

		await sendAdminNotificationEmail(input, fetchImpl);

		const [, init] = fetchImpl.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(JSON.parse(String(init.body))).toMatchObject({
			to: ["a@example.com", "b@example.com"],
			subject: "件名",
			text: "本文",
		});
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer key",
		);
	});

	it("失敗したときは、状態コードだけを伝える（本文は出さない）", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("secret body", { status: 429 }),
		);

		await expect(sendAdminNotificationEmail(input, fetchImpl)).rejects.toThrow(
			"429",
		);
		await expect(
			sendAdminNotificationEmail(input, fetchImpl),
		).rejects.not.toThrow("secret body");
	});
});
