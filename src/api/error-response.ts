import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { type ErrorCode, statusForErrorCode } from "#/errors/error-codes";
import { hideInternalError } from "#/errors/hide-internal-error";
import {
	GENERIC_ERROR_MESSAGE,
	UserFacingError,
} from "#/errors/user-facing-error";

// API のエラーの応答の形。画面・アプリは code で見分け、message を表示に使う。
export type ApiErrorBody = {
	error: { code: ErrorCode; message: string };
};

export function errorResponse(
	c: Context,
	code: ErrorCode,
	message: string,
): Response {
	const body: ApiErrorBody = { error: { code, message } };

	return c.json(body, statusForErrorCode(code));
}

// 送られた JSON が読めないなど、Hono が投げる HTTP のエラーの文。
const INVALID_REQUEST_MESSAGE = "送られた内容を読み取れませんでした";

// 投げられたエラーを、API の応答にする。内部のエラーは、ログに残して汎用の文にする（hideInternalError と同じ規則）。
export function toErrorResponse(error: unknown, c: Context): Response {
	if (error instanceof HTTPException && error.status < 500) {
		return errorResponse(c, "INVALID_INPUT", INVALID_REQUEST_MESSAGE);
	}

	const handled = hideInternalError(error);

	if (handled instanceof UserFacingError) {
		return errorResponse(c, handled.code, handled.message);
	}

	// Error でないもの（サーバー関数の redirect など）は、API では使わない。内部のエラーとして扱う。
	console.error("[api] unexpected thrown value", handled);

	return errorResponse(c, "INTERNAL", GENERIC_ERROR_MESSAGE);
}
