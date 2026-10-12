import { env } from "cloudflare:workers";
import type { DB } from "#/db/client";
import { createDrizzleAppealRepository } from "#/features/moderation/infrastructure/drizzle-appeal-repository";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";
import { createDrizzleUserReportRepository } from "#/features/reports/infrastructure/drizzle-user-report-repository";
import { parseAdminEmails } from "#/integrations/cloudflare-access/access-token";
import { sendAdminNotificationEmail } from "#/integrations/email/send-admin-notification-email";
import { notifyAdmins } from "../application/notify-admins";
import type { AdminNotificationKind } from "../domain/admin-notification";
import { createDrizzleAdminNotificationRepository } from "../infrastructure/drizzle-admin-notification-repository";

/**
 * 管理者（ADMIN_EMAILS）に、お知らせのメールを送る。失敗しても、例外にしない。
 * 管理者のメールや、メール送信の設定（RESEND_API_KEY、AUTH_EMAIL_FROM）がなければ、何もしない
 * （開発中は、コンソールに出す）。
 */
export async function notifyAdminsOf(
	db: DB,
	kind: AdminNotificationKind,
): Promise<void> {
	const to = parseAdminEmails(env.ADMIN_EMAILS);

	if (to.length === 0) {
		return;
	}

	const notifications = createDrizzleAdminNotificationRepository(db);

	await notifyAdmins(kind, {
		claimSlot: notifications.claimSlot,
		releaseSlot: notifications.release,
		countOpen: (target) => {
			if (target === "appeal") {
				return createDrizzleAppealRepository(db).countOpen();
			}

			if (target === "user-report") {
				return createDrizzleUserReportRepository(db).countOpen();
			}

			return createDrizzleReportRepository(db).countOpen();
		},
		send: async (message) => {
			if (env.RESEND_API_KEY && env.AUTH_EMAIL_FROM) {
				await sendAdminNotificationEmail({
					to,
					subject: message.subject,
					text: message.text,
					from: env.AUTH_EMAIL_FROM,
					apiKey: env.RESEND_API_KEY,
				});

				return;
			}

			console.log(
				`[開発用] 管理者へのお知らせ: ${message.subject}\n${message.text}`,
			);
		},
		baseUrl: env.BETTER_AUTH_URL,
	});
}
