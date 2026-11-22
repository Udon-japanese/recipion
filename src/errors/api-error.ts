import * as v from "valibot";

import { type ErrorCode, isErrorCode } from "./error-codes";
import { GENERIC_ERROR_MESSAGE } from "./user-facing-error";

// API（Hono）が失敗を返したときのエラー。画面は code で見分け、message を表示に使う。
export class ApiError extends Error {
	readonly code: ErrorCode;
	readonly status: number;

	constructor(code: ErrorCode, message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
	}
}

const apiErrorBodySchema = v.object({
	error: v.object({
		code: v.custom<ErrorCode>(isErrorCode),
		message: v.string(),
	}),
});

// 失敗した応答を ApiError にする。形が違う（API の外の失敗。Cloudflare のエラーページなど）ときは、内部のエラーとして扱う。
export async function readApiError(response: {
	status: number;
	json(): Promise<unknown>;
}): Promise<ApiError> {
	const body: unknown = await response.json().catch(() => null);
	const parsed = v.safeParse(apiErrorBodySchema, body);

	if (parsed.success) {
		return new ApiError(
			parsed.output.error.code,
			parsed.output.error.message,
			response.status,
		);
	}

	return new ApiError("INTERNAL", GENERIC_ERROR_MESSAGE, response.status);
}
