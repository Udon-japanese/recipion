import { describe, expect, it, vi } from "vitest";
import { isUserScope, refreshAppData } from "./refresh-app-data";

describe("refreshAppData", () => {
	it("一方が失敗しても、もう一方は取り直し、最後に必ず通知する", async () => {
		const invalidateRoutes = vi.fn(() => Promise.reject(new Error("down")));
		const syncShoppingMemo = vi.fn(() => Promise.resolve(null));
		const notify = vi.fn();

		await refreshAppData({ invalidateRoutes, syncShoppingMemo, notify });

		expect(invalidateRoutes).toHaveBeenCalledOnce();
		expect(syncShoppingMemo).toHaveBeenCalledOnce();
		expect(notify).toHaveBeenCalledOnce();
	});

	it("同期がないとき（ゲスト）は、取り直しと通知だけを行う", async () => {
		const invalidateRoutes = vi.fn(() => Promise.resolve());
		const notify = vi.fn();

		await refreshAppData({ invalidateRoutes, notify });

		expect(invalidateRoutes).toHaveBeenCalledOnce();
		expect(notify).toHaveBeenCalledOnce();
	});
});

describe("isUserScope", () => {
	it("user: の持ち主だけを通し、ゲストと未確定は通さない", () => {
		expect(isUserScope("user:abc")).toBe(true);
		expect(isUserScope("guest")).toBe(false);
		expect(isUserScope(null)).toBe(false);
	});
});
