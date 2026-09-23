import { afterEach, describe, expect, it, vi } from "vitest";

import { registerPwaServiceWorker } from "./pwa-register";

const originalServiceWorker = navigator.serviceWorker;

afterEach(() => {
	Object.defineProperty(navigator, "serviceWorker", {
		configurable: true,
		value: originalServiceWorker,
	});
});

describe("registerPwaServiceWorker", () => {
	it("本番環境ではService Workerを登録する", async () => {
		const register = vi.fn().mockResolvedValue({});

		Object.defineProperty(navigator, "serviceWorker", {
			configurable: true,
			value: {
				register,
			},
		});

		await registerPwaServiceWorker(false);

		expect(register).toHaveBeenCalledWith("/sw.js");
	});

	it("開発環境では登録しない", async () => {
		const register = vi.fn();

		Object.defineProperty(navigator, "serviceWorker", {
			configurable: true,
			value: {
				register,
			},
		});

		await registerPwaServiceWorker(true);

		expect(register).not.toHaveBeenCalled();
	});
});
