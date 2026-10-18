import { describe, expect, it } from "vitest";
import { adminNotificationEmail } from "./admin-notification-email";

describe("adminNotificationEmail", () => {
	it("種類と件数とリンクだけを書く（投稿の中身は書かない）", () => {
		const { to, subject, text, html } = adminNotificationEmail(
			["a@example.com", "b@example.com"],
			{
				kindLabel: "利用者からの通報",
				openCount: 3,
				url: "https://recipion.app/admin/reports",
			},
		);

		expect(to).toEqual(["a@example.com", "b@example.com"]);

		expect(subject).toContain("利用者からの通報");
		expect(subject).toContain("未対応3件");
		expect(text).toContain("https://recipion.app/admin/reports");
		expect(text).toContain("30分に1通");
		expect(html).toContain("https://recipion.app/admin/reports");
	});
});
