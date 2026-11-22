import { getRequestHeaders } from "@tanstack/react-start/server";

import {
	resolveSession,
	type SessionOptions,
} from "#/integrations/better-auth/resolve-session";

// サーバー関数の認可の入口。中身は resolveSession（API と共通）。
export async function requireSession(options: SessionOptions = {}) {
	return resolveSession(getRequestHeaders(), options);
}
