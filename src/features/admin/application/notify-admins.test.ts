import { describe, expect, it, vi } from "vitest";
import type { AdminNotificationKind } from "../domain/admin-notification";
import { type NotifyAdminsDependencies, notifyAdmins } from "./notify-admins";

function setup(overrides: Partial<NotifyAdminsDependencies> = {}) {
	const send = vi.fn(async () => {});
	const releaseSlot = vi.fn(async () => {});
	const claimSlot = vi.fn(async () => true);
	const dependencies: NotifyAdminsDependencies = {
		claimSlot,
		releaseSlot,
		countOpen: async () => 4,
		recipients: ["admin@example.com"],
		send,
		baseUrl: "https://recipion.app/",
		now: new Date("2026-10-12T00:00:00.000Z"),
		...overrides,
	};

	return { dependencies, send, releaseSlot, claimSlot };
}

describe("notifyAdmins", () => {
	it.each<[AdminNotificationKind, string, string]>([
		["report", "利用者からの通報", "https://recipion.app/admin/reports"],
		["auto-detected", "自動検知", "https://recipion.app/admin/reports"],
		["appeal", "停止への申し立て", "https://recipion.app/admin/appeals"],
	])("%s：件数とリンクを添えて送る", async (kind, label, url) => {
		const { dependencies, send, claimSlot } = setup();

		await expect(notifyAdmins(kind, dependencies)).resolves.toBe("sent");

		expect(claimSlot).toHaveBeenCalledWith(
			kind,
			new Date("2026-10-12T00:00:00.000Z"),
			30 * 60 * 1000,
		);
		const [message] = send.mock.calls[0] as unknown as [
			{ to: readonly string[]; subject: string; text: string },
		];

		expect(message.to).toEqual(["admin@example.com"]);
		expect(message.subject).toContain(label);
		expect(message.subject).toContain("未対応4件");
		expect(message.text).toContain(url);
	});

	it("前回から間隔があいていなければ、送らない", async () => {
		const { dependencies, send } = setup({ claimSlot: async () => false });

		await expect(notifyAdmins("report", dependencies)).resolves.toBe(
			"throttled",
		);
		expect(send).not.toHaveBeenCalled();
	});

	it("送れなかったら、記録を戻す（次の通知を止めない）。例外にはしない", async () => {
		const { dependencies, releaseSlot } = setup({
			send: async () => {
				throw new Error("429");
			},
		});

		await expect(notifyAdmins("report", dependencies)).resolves.toBe("failed");
		expect(releaseSlot).toHaveBeenCalledWith("report");
	});

	it("記録の確認で失敗したら、送らず、戻しもしない。例外にはしない", async () => {
		const { dependencies, send, releaseSlot } = setup({
			claimSlot: async () => {
				throw new Error("db");
			},
		});

		await expect(notifyAdmins("appeal", dependencies)).resolves.toBe("failed");
		expect(send).not.toHaveBeenCalled();
		expect(releaseSlot).not.toHaveBeenCalled();
	});
});
