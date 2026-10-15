import { createServerFn } from "@tanstack/react-start";
import { UserFacingError } from "#/errors/user-facing-error";
import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";

// 管理者の画面を開いてよいかを、画面の入口で確かめる（管理者なら true）。
// 管理者でなければ、例外にせず、false を返す（画面は「見つかりません」にして、管理者の画面があることを知らせない）。
export const assertAdminServerFn = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			await requireAdmin();

			return true;
		} catch (error) {
			// 管理者として確認できないのは、ふつうの結果。それ以外（鍵の取得の失敗など）は、サーバーのログに残す。
			if (!(error instanceof UserFacingError)) {
				console.error("[admin] could not verify admin", error);
			}

			return false;
		}
	},
);
