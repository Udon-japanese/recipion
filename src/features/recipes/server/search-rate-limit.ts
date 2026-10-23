import { env } from "cloudflare:workers";
import { UserFacingError } from "#/errors/user-facing-error";

// 検索の回数の制限（1人あたり、1分に決まった回数）。バインディングがない開発サーバーでは、制限しない。
export async function assertWithinSearchLimit(userId: string): Promise<void> {
	const limiter = (env as { LINK_SEARCH_LIMITER?: RateLimit })
		.LINK_SEARCH_LIMITER;

	if (limiter && !(await limiter.limit({ key: userId })).success) {
		throw new UserFacingError(
			"検索の回数が多すぎます。少し待ってから、お試しください。",
		);
	}
}
