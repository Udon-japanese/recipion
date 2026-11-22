import type { ValidationTargets } from "hono";
import { validator } from "hono-openapi";
import type * as v from "valibot";

import { errorResponse } from "#/api/error-response";

const INVALID_INPUT_MESSAGE = "送られた内容の形が正しくありません";

// API の入力を Valibot で確かめる（hono-openapi の validator。あとで OpenAPI の契約を書き出せる）。
// 合わなければ、400 と INVALID_INPUT（Valibot の英語の文は出さない）。
export function validate<
	Schema extends v.GenericSchema,
	Target extends keyof ValidationTargets,
>(target: Target, schema: Schema) {
	return validator(target, schema, (result, c) => {
		if (!result.success) {
			return errorResponse(c, "INVALID_INPUT", INVALID_INPUT_MESSAGE);
		}
	});
}
