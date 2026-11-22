import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { apiApp } from "#/api/app";

// Worker の入口。/api/ で始まる要求は API（Hono）に、それ以外は TanStack Start（画面・サーバー関数）に渡す。
// あとで Durable Objects などを export するときも、このファイルに足す。
export default createServerEntry({
	fetch(request, opts) {
		if (new URL(request.url).pathname.startsWith("/api/")) {
			return apiApp.fetch(request);
		}

		return handler.fetch(request, opts);
	},
});
