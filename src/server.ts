import { apiApp } from "#/api/app";
import { createTeapotResponse } from "#/config/teapot-page";

// Worker の入口。画面（HTML・JS・CSS）は、Cloudflare の静的ファイルとして配り、Worker は通らない
// （wrangler.jsonc の assets。知らないパスは index.html を返す）。Worker に来るのは run_worker_first の対象だけ。
// あとで Durable Objects などを export するときも、このファイルに足す。
export default {
	fetch(request) {
		const { pathname } = new URL(request.url);

		// 418 I'm a teapot（アプリの画面は読み込まない、そのままの HTML）。
		if (pathname === "/teapot") {
			return createTeapotResponse();
		}

		return apiApp.fetch(request);
	},
} satisfies ExportedHandler;
