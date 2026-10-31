import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BUTTON_TIMINGS,
	type ButtonStatus,
	useButtonPhase,
} from "./use-button-phase";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

function setup(initial: ButtonStatus = "idle") {
	return renderHook(({ status }) => useButtonPhase(status), {
		initialProps: { status: initial },
	});
}

function advance(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

describe("useButtonPhase", () => {
	it("処理中でも、短い間はマスコットを出さない", () => {
		const { result } = setup();
		expect(result.current).toBe("idle");
	});

	it("処理が長引くと、マスコットを出す", () => {
		const { result, rerender } = setup();
		rerender({ status: "pending" });
		advance(BUTTON_TIMINGS.loadingDelayMs - 1);
		expect(result.current).toBe("idle");
		advance(1);
		expect(result.current).toBe("loading");
	});

	it("一瞬で終わる処理は、マスコットを出さずに完了へ進む", () => {
		const { result, rerender } = setup();
		rerender({ status: "pending" });
		advance(50);
		rerender({ status: "success" });
		expect(result.current).toBe("success");
	});

	it("マスコットを出したら、最低の時間は見せてから完了にする", () => {
		const { result, rerender } = setup();
		rerender({ status: "pending" });
		advance(BUTTON_TIMINGS.loadingDelayMs);
		expect(result.current).toBe("loading");

		advance(100);
		rerender({ status: "success" });
		expect(result.current).toBe("loading");

		advance(BUTTON_TIMINGS.loadingMinMs - 100);
		expect(result.current).toBe("success");
	});

	it("完了は、広がり、そのあと元に戻る", () => {
		const { result, rerender } = setup();
		rerender({ status: "success" });
		expect(result.current).toBe("success");

		advance(BUTTON_TIMINGS.expandDelayMs);
		expect(result.current).toBe("success-expanded");

		advance(BUTTON_TIMINGS.successHoldMs);
		expect(result.current).toBe("idle");
	});

	it("失敗は、完了より長く見せてから戻る", () => {
		const { result, rerender } = setup();
		rerender({ status: "error" });
		advance(BUTTON_TIMINGS.expandDelayMs);
		expect(result.current).toBe("error-expanded");

		advance(BUTTON_TIMINGS.successHoldMs);
		expect(result.current).toBe("error-expanded");

		advance(BUTTON_TIMINGS.errorHoldMs - BUTTON_TIMINGS.successHoldMs);
		expect(result.current).toBe("idle");
	});

	it("待機に戻されたら、すぐ元の形になる", () => {
		const { result, rerender } = setup();
		rerender({ status: "pending" });
		advance(BUTTON_TIMINGS.loadingDelayMs);
		rerender({ status: "idle" });
		expect(result.current).toBe("idle");
	});

	it("表示されたときから、すでに完了だったものは、完了の動きを演じない（前の操作の結果が、残っているだけ）", () => {
		const { result } = setup("success");

		advance(BUTTON_TIMINGS.expandDelayMs + 10);
		expect(result.current).toBe("idle");
	});

	it("表示されたときから失敗だったものも、演じない。そのあと、新しい操作を始めたら、ふつうに動く", () => {
		const { result, rerender } = setup("error");

		advance(BUTTON_TIMINGS.expandDelayMs + 10);
		expect(result.current).toBe("idle");

		rerender({ status: "pending" });
		advance(50);
		rerender({ status: "success" });
		expect(result.current).toBe("success");
	});
});
