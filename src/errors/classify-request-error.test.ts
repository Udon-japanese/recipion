import { describe, expect, it } from "vitest";
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
			error: new UserFacingError(GENERIC_ERROR_MESSAGE),
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
			error: new UserFacingError(AUTH_REQUIRED_MESSAGE),
			isOnline: true,
			kind: "account",
		},
		{
			label: "アカウントが変わった",
			error: new UserFacingError(ACCOUNT_CHANGED_MESSAGE),
			isOnline: true,
			kind: "account",
		},
		{
			label: "停止中",
			error: new UserFacingError(ACCOUNT_SUSPENDED_MESSAGE),
			isOnline: true,
			kind: "account",
		},
		{
			label: "サーバーの汎用の文",
			error: new UserFacingError(GENERIC_ERROR_MESSAGE),
			isOnline: true,
			kind: "server",
		},
		{
			label: "見せてよい内容の文",
			error: new UserFacingError(
				"卵の在庫の単位（g）に買った量を換算できません",
			),
			isOnline: true,
			kind: "rejected",
		},
	])("$label → $kind", ({ error, isOnline, kind }) => {
		expect(classifyRequestError(error, isOnline)).toBe(kind);
	});
});
