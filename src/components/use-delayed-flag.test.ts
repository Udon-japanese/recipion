import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDelayedFlag } from "./use-delayed-flag";

afterEach(() => {
	vi.useRealTimers();
});

describe("useDelayedFlag", () => {
	it("true が、決めた時間つづいたときだけ true にする。false には、すぐ戻す", () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ value }) => useDelayedFlag(value, 400),
			{ initialProps: { value: true } },
		);

		expect(result.current).toBe(false);

		act(() => vi.advanceTimersByTime(399));
		expect(result.current).toBe(false);

		act(() => vi.advanceTimersByTime(1));
		expect(result.current).toBe(true);

		rerender({ value: false });
		expect(result.current).toBe(false);
	});

	it("決めた時間より早く false に戻れば、一度も true にしない（読み込みがすぐ終わったとき）", () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ value }) => useDelayedFlag(value, 400),
			{ initialProps: { value: true } },
		);

		act(() => vi.advanceTimersByTime(100));
		rerender({ value: false });
		act(() => vi.advanceTimersByTime(1000));

		expect(result.current).toBe(false);
	});
});
