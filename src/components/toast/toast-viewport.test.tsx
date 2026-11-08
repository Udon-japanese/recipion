import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	dismissToast,
	MAX_TOASTS,
	resetToastsForTest,
	showToast,
} from "./toast-store";
import { ToastViewport } from "./toast-viewport";

afterEach(() => {
	act(() => resetToastsForTest());
	vi.useRealTimers();
});

describe("ToastViewport", () => {
	it("出したお知らせを出し、時間が来たら消す。処理中（消さない）は、残す", () => {
		vi.useFakeTimers();
		render(<ToastViewport />);

		act(() => {
			showToast({ message: "保存しました" });
			showToast({ id: "sync", message: "同期しています…", duration: null });
		});

		expect(screen.getByText("保存しました")).toBeInTheDocument();

		act(() => vi.advanceTimersByTime(3000));
		act(() => vi.advanceTimersByTime(300));

		expect(screen.queryByText("保存しました")).toBeNull();
		expect(screen.getByText("同期しています…")).toBeInTheDocument();
	});

	it("同じ id で出し直すと、その場で差し替え、消えるまでの時間を数え直す", () => {
		vi.useFakeTimers();
		render(<ToastViewport />);

		act(() => {
			showToast({ id: "sync", message: "同期しています…", duration: null });
		});
		act(() => {
			showToast({ id: "sync", message: "3件の在庫を反映しました" });
		});

		expect(screen.queryByText("同期しています…")).toBeNull();
		expect(screen.getByText("3件の在庫を反映しました")).toBeInTheDocument();

		act(() => vi.advanceTimersByTime(3000));
		act(() => vi.advanceTimersByTime(300));

		expect(screen.queryByText("3件の在庫を反映しました")).toBeNull();
	});

	it("操作を押すと、その操作をして、お知らせを消す。dismissToast でも消える", async () => {
		const user = userEvent.setup();
		const undo = vi.fn();

		render(<ToastViewport />);
		act(() => {
			showToast({
				message: "見出しを消しました",
				action: { label: "元に戻す", onClick: undo },
			});
			showToast({ id: "other", message: "読み込んでいます…", duration: null });
		});

		await user.click(screen.getByRole("button", { name: "元に戻す" }));

		expect(undo).toHaveBeenCalledTimes(1);
		await vi.waitFor(() =>
			expect(screen.queryByText("見出しを消しました")).toBeNull(),
		);

		act(() => dismissToast("other"));

		await vi.waitFor(() =>
			expect(screen.queryByText("読み込んでいます…")).toBeNull(),
		);
	});

	it(`一度に出すのは ${MAX_TOASTS} つまで（古いものから消す）`, async () => {
		render(<ToastViewport />);
		act(() => {
			for (let index = 1; index <= MAX_TOASTS + 1; index++) {
				showToast({ message: `お知らせ${index}`, duration: null });
			}
		});

		await vi.waitFor(() => expect(screen.queryByText("お知らせ1")).toBeNull());
		expect(screen.getByText(`お知らせ${MAX_TOASTS + 1}`)).toBeInTheDocument();
	});

	it("見た目は、処理中は info、終わったものは success、操作つきは dark（指定すれば、それに従う）", () => {
		render(<ToastViewport />);
		act(() => {
			showToast({ message: "同期しています…", spinning: true, duration: null });
			showToast({ message: "更新しました", duration: null });
			showToast({
				message: "削除しました",
				action: { label: "元に戻す", onClick: () => {} },
			});
		});

		const toneOf = (text: string) =>
			screen.getByText(text).closest("output")?.getAttribute("data-tone");

		expect(toneOf("同期しています…")).toBe("info");
		expect(toneOf("更新しました")).toBe("success");
		expect(toneOf("削除しました")).toBe("dark");
	});
});
