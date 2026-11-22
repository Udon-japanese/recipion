import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import { UserFacingError } from "#/errors/user-facing-error";
import type { AdminOperations } from "./admin-operations";

function createApp(options: { admin: boolean }) {
	const operations: AdminOperations = {
		summary: vi.fn(async () => ({
			openReports: 1,
			openAppeals: 0,
			openUserReports: 2,
		})),
		searchUsers: vi.fn(),
		suspendUser: vi.fn(),
		liftSuspension: vi.fn(),
		listOpenAppeals: vi.fn(),
		listResolvedAppeals: vi.fn(),
		resolveAppeal: vi.fn(),
		listOpenReports: vi.fn(),
		listResolvedReports: vi.fn(),
		getReportedRecipe: vi.fn(),
		resolveReport: vi.fn(),
		listOpenUserReports: vi.fn(),
		listResolvedUserReports: vi.fn(),
		resolveUserReport: vi.fn(),
	};
	const resolveAdmin = vi.fn(async () => {
		if (!options.admin) {
			throw new UserFacingError("見つかりませんでした", { code: "NOT_FOUND" });
		}

		return { db: {} as never, adminEmail: "admin@example.com" };
	});
	const createOperations = vi.fn(() => operations);
	const app = createTestApiApp({ admin: { resolveAdmin, createOperations } });

	return { app, operations, createOperations };
}

describe("管理者の API", () => {
	it("管理者でなければ、どのルートも 404（管理者の API があることを知らせない）", async () => {
		const { app, createOperations } = createApp({ admin: false });

		for (const path of ["/check", "/summary", "/reports"]) {
			const response = await app.request(`/api/v1/admin${path}`);

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({
				error: { code: "NOT_FOUND", message: "見つかりませんでした" },
			});
		}

		expect(createOperations).not.toHaveBeenCalled();
	});

	it("管理者なら、入口の確認と件数を返す", async () => {
		const { app } = createApp({ admin: true });

		expect(await (await app.request("/api/v1/admin/check")).json()).toEqual({
			admin: true,
		});
		expect(await (await app.request("/api/v1/admin/summary")).json()).toEqual({
			openReports: 1,
			openAppeals: 0,
			openUserReports: 2,
		});
	});
});
