import { describe, expect, it, vi } from "vitest";
import {
	APP_SHELL_CACHE_NAME,
	clearAppShellCache,
} from "./clear-app-shell-cache";

describe("clearAppShellCache", () => {
	it("アプリのシェルのキャッシュを削除する", async () => {
		const cacheStorage = { delete: vi.fn(async () => true) };

		await clearAppShellCache(cacheStorage);

		expect(cacheStorage.delete).toHaveBeenCalledWith(APP_SHELL_CACHE_NAME);
	});

	it("キャッシュの削除に失敗しても例外にしない", async () => {
		const cacheStorage = {
			delete: vi.fn(async () => {
				throw new Error("storage error");
			}),
		};

		await expect(clearAppShellCache(cacheStorage)).resolves.toBeUndefined();
	});
});
