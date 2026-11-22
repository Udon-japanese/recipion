import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error";
import { classifyRequestError } from "./classify-request-error";
import {
	ACCOUNT_CHANGED_MESSAGE,
	ACCOUNT_SUSPENDED_MESSAGE,
	AUTH_REQUIRED_MESSAGE,
	GENERIC_ERROR_MESSAGE,
	UserFacingError,
} from "./user-facing-error";

describe("classifyRequestError", () => {
	it.each([
		{
			label: "fetch の失敗（英語の文）",
			error: new TypeError("Failed to fetch"),
			isOnline: true,
			kind: "offline",
		},
		{
			label: "端末がオフライン（文が日本語でも）",
			error: new UserFacingError(GENERIC_ERROR_MESSAGE, { code: "INTERNAL" }),
			isOnline: false,
			kind: "offline",
		},
		{
			label: "Error でないもの",
			error: "boom",
			isOnline: true,
			kind: "offline",
		},
		{
			label: "ログインが必要",
			error: new UserFacingError(AUTH_REQUIRED_MESSAGE, {
				code: "AUTH_REQUIRED",
			}),
			isOnline: true,
			kind: "account",
		},
		{
			label: "アカウントが変わった",
			error: new UserFacingError(ACCOUNT_CHANGED_MESSAGE, {
				code: "ACCOUNT_CHANGED",
			}),
			isOnline: true,
			kind: "account",
		},
		{
			label: "停止中",
			error: new UserFacingError(ACCOUNT_SUSPENDED_MESSAGE, {
				code: "ACCOUNT_SUSPENDED",
			}),
			isOnline: true,
			kind: "account",
		},
		{
			label: "サーバーの汎用の文",
			error: new UserFacingError(GENERIC_ERROR_MESSAGE, { code: "INTERNAL" }),
			isOnline: true,
			kind: "server",
		},
		{
			label: "見せてよい内容の文",
			error: new UserFacingError(
				"卵の在庫の単位（g）に買った量を換算できません",
				{ code: "INVALID_INPUT" },
			),
			isOnline: true,
			kind: "rejected",
		},
	])("$label → $kind", ({ error, isOnline, kind }) => {
		expect(classifyRequestError(error, isOnline)).toBe(kind);
	});
});

describe("classifyRequestError（API の失敗はコードで見分ける）", () => {
	it.each([
		["AUTH_REQUIRED", "account"],
		["ACCOUNT_CHANGED", "account"],
		["ACCOUNT_SUSPENDED", "account"],
		["INTERNAL", "server"],
		["INVALID_INPUT", "rejected"],
		["RATE_LIMITED", "rejected"],
	] as const)("%s は %s", (code, kind) => {
		expect(classifyRequestError(new ApiError(code, "文", 400), true)).toBe(
			kind,
		);
	});

	it("端末がオフラインなら、API の失敗でも offline", () => {
		expect(
			classifyRequestError(new ApiError("INTERNAL", "文", 500), false),
		).toBe("offline");
	});
});
