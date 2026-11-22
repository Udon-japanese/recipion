import { describe, expect, it, vi } from "vitest";

import { ApiError } from "#/errors/api-error";
import { GENERIC_ERROR_MESSAGE } from "#/errors/user-facing-error";
import { createApiClient, readApiResponse } from "./client";

describe("createApiClient", () => {
	it("同じオリジンの /api/v1/... に送る", async () => {
		const fetch = vi.fn(async () => Response.json({ results: [] }));
		const client = createApiClient(fetch);

		await client.api.v1.shopping.sync.push.$post({ json: { records: [] } });

		expect(fetch).toHaveBeenCalledWith(
			"/api/v1/shopping/sync/push",
			expect.objectContaining({ method: "POST" }),
		);
	});
});

describe("readApiResponse", () => {
	it("成功なら、中身を返す", async () => {
		await expect(readApiResponse(Response.json({ ok: 1 }))).resolves.toEqual({
			ok: 1,
		});
	});

	it("失敗なら、API のコードと文で ApiError を投げる", async () => {
		const error = await readApiResponse(
			Response.json(
				{ error: { code: "ACCOUNT_CHANGED", message: "変わりました" } },
				{ status: 403 },
			),
		).catch((thrown: unknown) => thrown);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			code: "ACCOUNT_CHANGED",
			message: "変わりました",
			status: 403,
		});
	});

	it("API の外の失敗（形の違う応答）は、INTERNAL と汎用の文", async () => {
		const error = await readApiResponse(
			new Response("<html>502</html>", { status: 502 }),
		).catch((thrown: unknown) => thrown);

		expect(error).toMatchObject({
			code: "INTERNAL",
			message: GENERIC_ERROR_MESSAGE,
			status: 502,
		});
	});
});
