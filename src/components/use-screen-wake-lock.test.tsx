import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScreenWakeLock } from "./use-screen-wake-lock";

// 本物の WakeLockSentinel の代わり（release() か、システムによる解除で、release イベントが届く）。
class FakeSentinel extends EventTarget {
	released = false;

	release = vi.fn(async () => {
		this.releaseBySystem();
	});

	releaseBySystem() {
		if (!this.released) {
			this.released = true;
			this.dispatchEvent(new Event("release"));
		}
	}
}

function installWakeLock(request: () => Promise<FakeSentinel>) {
	const mock = vi.fn(request);

	Object.defineProperty(navigator, "wakeLock", {
		configurable: true,
		value: { request: mock },
	});

	return mock;
}

function setVisibility(state: "visible" | "hidden") {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		get: () => state,
	});
	document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
	Reflect.deleteProperty(navigator, "wakeLock");
	Reflect.deleteProperty(document, "visibilityState");
});

describe("useScreenWakeLock", () => {
	it("有効なあいだ、画面のロックを取り、無効にすると返す", async () => {
		const sentinels: FakeSentinel[] = [];
		const request = installWakeLock(async () => {
			const sentinel = new FakeSentinel();

			sentinels.push(sentinel);

			return sentinel;
		});
		const { result, rerender } = renderHook(
			({ enabled }) => useScreenWakeLock(enabled),
			{ initialProps: { enabled: true } },
		);

		await vi.waitFor(() => expect(result.current.isActive).toBe(true));
		expect(request).toHaveBeenCalledWith("screen");

		rerender({ enabled: false });

		expect(result.current.isActive).toBe(false);
		expect(sentinels[0]?.release).toHaveBeenCalled();
	});

	it("無効なら、ロックを求めない", () => {
		const request = installWakeLock(async () => new FakeSentinel());
		const { result } = renderHook(() => useScreenWakeLock(false));

		expect(request).not.toHaveBeenCalled();
		expect(result.current).toEqual({ isSupported: true, isActive: false });
	});

	it("使えないブラウザでは、何もしない", () => {
		const { result } = renderHook(() => useScreenWakeLock(true));

		expect(result.current).toEqual({ isSupported: false, isActive: false });
	});

	it("画面が見えなくなってロックが解かれても、見えたときに、取り直す", async () => {
		const sentinels: FakeSentinel[] = [];
		const request = installWakeLock(async () => {
			const sentinel = new FakeSentinel();

			sentinels.push(sentinel);

			return sentinel;
		});
		const { result } = renderHook(() => useScreenWakeLock(true));

		await vi.waitFor(() => expect(result.current.isActive).toBe(true));

		act(() => {
			sentinels[0]?.releaseBySystem();
		});

		expect(result.current.isActive).toBe(false);

		await act(async () => {
			setVisibility("visible");
		});

		await vi.waitFor(() => expect(result.current.isActive).toBe(true));
		expect(request).toHaveBeenCalledTimes(2);
	});

	it("ロックが取れているあいだは、見えたときに、二重には求めない", async () => {
		const request = installWakeLock(async () => new FakeSentinel());
		const { result } = renderHook(() => useScreenWakeLock(true));

		await vi.waitFor(() => expect(result.current.isActive).toBe(true));

		await act(async () => {
			setVisibility("visible");
		});

		expect(request).toHaveBeenCalledTimes(1);
	});

	it("断られても（低電力など）、例外にせず、有効にならない", async () => {
		const request = installWakeLock(async () => {
			throw new DOMException("low battery", "NotAllowedError");
		});
		const { result } = renderHook(() => useScreenWakeLock(true));

		await vi.waitFor(() => expect(request).toHaveBeenCalled());

		expect(result.current).toEqual({ isSupported: true, isActive: false });
	});

	it("求めている途中で閉じたら、取れたロックを、すぐに返す", async () => {
		let resolve: (sentinel: FakeSentinel) => void = () => {};
		const sentinel = new FakeSentinel();

		installWakeLock(
			() =>
				new Promise<FakeSentinel>((done) => {
					resolve = done;
				}),
		);

		const { unmount } = renderHook(() => useScreenWakeLock(true));

		unmount();

		await act(async () => {
			resolve(sentinel);
		});

		expect(sentinel.release).toHaveBeenCalled();
	});
});
