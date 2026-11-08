import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHEET_EXIT_MS, useExitPresence } from "./use-exit-presence";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

type Target = { id: string };

function setup(initial: Target | null) {
	return renderHook(({ value }) => useExitPresence(value), {
		initialProps: { value: initial },
	});
}

function advance(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

describe("useExitPresence", () => {
	it("閉じたあとも、閉じる動きのあいだは、最後の値を返す", () => {
		const first = { id: "a" };
		const { result, rerender } = setup(first);

		expect(result.current).toEqual({ value: first, open: true });

		rerender({ value: null });
		expect(result.current).toEqual({ value: first, open: false });

		advance(SHEET_EXIT_MS - 1);
		expect(result.current.value).toBe(first);

		advance(1);
		expect(result.current).toEqual({ value: null, open: false });
	});

	it("閉じる途中で別の値が来たら、その値で開き直し、あとから消えない", () => {
		const first = { id: "a" };
		const second = { id: "b" };
		const { result, rerender } = setup(first);

		rerender({ value: null });
		advance(SHEET_EXIT_MS / 2);
		rerender({ value: second });
		advance(SHEET_EXIT_MS);

		expect(result.current).toEqual({ value: second, open: true });

		// 閉じたときに残るのは、新しい値。
		rerender({ value: null });
		expect(result.current).toEqual({ value: second, open: false });
	});

	it("最初から閉じていれば、何も返さない", () => {
		const { result } = setup(null);

		expect(result.current).toEqual({ value: null, open: false });
	});
});
