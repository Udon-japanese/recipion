import { env } from "cloudflare:workers";

import type { Mailer } from "./mailer";
import { selectMailer } from "./select-mailer";

// 環境に合った Mailer を返す。環境変数を読むのは、ここだけ（cloudflare:workers を読むため、テストからは読まない）。
// 選び方は select-mailer.ts（開発中は送らずにコンソール、本番は Resend）。
export function getMailer(): Mailer {
	return selectMailer({
		resendApiKey: env.RESEND_API_KEY,
		isDevelopment: import.meta.env.DEV,
	});
}
