import { adminNotificationEmail } from "#/integrations/email/admin-notification-email";
import {
	type AdminNotificationKind,
	adminNotificationIntervalMs,
	adminNotificationKindLabels,
	adminNotificationPaths,
} from "../domain/admin-notification";

export type NotifyAdminsDependencies = {
	// 送ってよいか（同じ種類の前回から、間隔があいているか）を決め、送るなら記録する。
	claimSlot: (
		kind: AdminNotificationKind,
		now: Date,
		intervalMs: number,
	) => Promise<boolean>;
	// 未対応の件数。
	countOpen: (kind: AdminNotificationKind) => Promise<number>;
	send: (message: {
		subject: string;
		text: string;
		html: string;
	}) => Promise<void>;
	// 送れなかったときに、記録を戻す（次の通知を、30分止めないため）。
	releaseSlot?: (kind: AdminNotificationKind) => Promise<void>;
	// 画面のリンクの先頭（例：https://recipion.app）。
	baseUrl: string;
	now?: Date;
};

export type NotifyAdminsResult = "sent" | "throttled" | "failed";

/**
 * 管理者にお知らせのメールを送る。同じ種類は、30分に1通まで。
 * 失敗しても、例外にしない（通報や公開などの、元の処理を止めないため）。
 */
export async function notifyAdmins(
	kind: AdminNotificationKind,
	dependencies: NotifyAdminsDependencies,
): Promise<NotifyAdminsResult> {
	let claimed = false;

	try {
		const allowed = await dependencies.claimSlot(
			kind,
			dependencies.now ?? new Date(),
			adminNotificationIntervalMs,
		);

		if (!allowed) {
			return "throttled";
		}

		claimed = true;

		const openCount = await dependencies.countOpen(kind);

		await dependencies.send(
			adminNotificationEmail({
				kindLabel: adminNotificationKindLabels[kind],
				openCount,
				url: `${dependencies.baseUrl.replace(/\/+$/u, "")}${adminNotificationPaths[kind]}`,
			}),
		);

		return "sent";
	} catch {
		if (claimed) {
			try {
				await dependencies.releaseSlot?.(kind);
			} catch {
				// 戻せなくても、元の処理には影響させない。
			}
		}

		return "failed";
	}
}
