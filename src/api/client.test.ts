import { afterEach, describe, expect, it, vi } from "vitest";
import { minimumClientVersions } from "#/config/client-versions";
import { ApiError } from "#/errors/api-error";
import { GENERIC_ERROR_MESSAGE } from "#/errors/user-facing-error";
import { createApiClient, readApiResponse } from "./client";
import {
	dismissClientUpdateRequired,
	isClientUpdateRequired,
} from "./client-update-required";
import { checkClientVersion } from "./client-version";

afterEach(() => {
	dismissClientUpdateRequired();
});

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

	it("画面の種類と版のヘッダーを送り、API の版の確認を通る", async () => {
		const fetch = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				Response.json({ results: [] }),
		);
		const client = createApiClient(fetch);

		await client.api.v1.shopping.sync.push.$post({ json: { records: [] } });

		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);

		expect(
			checkClientVersion(
				headers.get("x-recipion-client"),
				minimumClientVersions,
			),
		).toBe("ok");
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

describe("readApiResponse と、画面の版が古いときの案内", () => {
	it.each([
		{ code: "CLIENT_UPDATE_REQUIRED", status: 426, expected: true },
		{ code: "ACCOUNT_CHANGED", status: 403, expected: false },
		{ code: "INTERNAL", status: 500, expected: false },
	])(
		"$code なら、案内を出すのは $expected",
		async ({ code, status, expected }) => {
			await readApiResponse(
				Response.json({ error: { code, message: "文" } }, { status }),
			).catch(() => undefined);

			expect(isClientUpdateRequired()).toBe(expected);
		},
	);
});
