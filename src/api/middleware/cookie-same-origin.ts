import { createMiddleware } from "hono/factory";

import { errorResponse } from "#/api/error-response";
import { isSameOriginRequest, needsSameOriginCheck } from "#/api/same-origin";

const CROSS_SITE_MESSAGE = "この操作は、このサイトの画面からしか行えません";

// Cookie つきの、変更を伴う要求は、同じオリジンからだけ受け付ける（CSRF の対策）。
export const cookieSameOriginMiddleware = createMiddleware(async (c, next) => {
	const headers = c.req.raw.headers;

	if (
		needsSameOriginCheck(c.req.method, headers) &&
		!isSameOriginRequest(headers, c.req.url)
	) {
		return errorResponse(c, "FORBIDDEN", CROSS_SITE_MESSAGE);
	}

	await next();
});
