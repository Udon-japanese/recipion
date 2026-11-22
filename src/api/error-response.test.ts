import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it, vi } from "vitest";

import {
	GENERIC_ERROR_MESSAGE,
	UserFacingError,
} from "#/errors/user-facing-error";
import { toErrorResponse } from "./error-response";
import { sessionMiddleware } from "./middleware/session";

function appThrowing(error: unknown) {
	const app = new Hono().get("/", () => {
		throw error;
	});

	app.onError((thrown, c) => toErrorResponse(thrown, c));

	return app;
}

describe("toErrorResponse", () => {
	it("UserFacingError は、コードと文を返し、コードに合った HTTP の状態にする", async () => {
		const response = await appThrowing(
			new UserFacingError("認証が必要です", { code: "AUTH_REQUIRED" }),
		).request("/");

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: { code: "AUTH_REQUIRED", message: "認証が必要です" },
		});
	});

	it("コードのない UserFacingError は、USER_FACING（文はそのまま）", async () => {
		const response = await appThrowing(
			new UserFacingError("レシピが見つかりません"),
		).request("/");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: { code: "USER_FACING", message: "レシピが見つかりません" },
		});
	});

	it("内部のエラーは、汎用の文と INTERNAL にし、中身を出さない", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const response = await appThrowing(
			new Error('Failed query: select "x" from "user"'),
		).request("/");
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({
			error: { code: "INTERNAL", message: GENERIC_ERROR_MESSAGE },
		});
		expect(JSON.stringify(body)).not.toContain("Failed query");
		spy.mockRestore();
	});

	it("Hono の 4xx（読めない JSON など）は、INVALID_INPUT", async () => {
		const response = await appThrowing(
			new HTTPException(400, { message: "Malformed JSON" }),
		).request("/");

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "INVALID_INPUT" },
		});
	});
});

describe("sessionMiddleware", () => {
	it("セッションを c.var.session に入れる", async () => {
		const resolve = vi.fn(async () => ({ db: {} as never, userId: "user-1" }));
		const app = new Hono().get("/", sessionMiddleware(resolve), (c) =>
			c.text(c.var.session.userId),
		);
		const response = await app.request("/", {
			headers: { authorization: "Bearer a.b" },
		});

		expect(await response.text()).toBe("user-1");
		expect(resolve).toHaveBeenCalledWith(expect.any(Headers), {});
	});

	it("セッションを確かめられなければ、onError が 401 にする", async () => {
		const resolve = vi.fn(async () => {
			throw new UserFacingError("認証が必要です", { code: "AUTH_REQUIRED" });
		});
		const app = new Hono().get("/", sessionMiddleware(resolve), (c) =>
			c.text("ok"),
		);

		app.onError((thrown, c) => toErrorResponse(thrown, c));

		const response = await app.request("/");

		expect(response.status).toBe(401);
	});
});
