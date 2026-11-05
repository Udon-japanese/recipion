import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUTTON_TIMINGS } from "../button/use-button-phase";
import { CornerSheet } from "./corner-sheet";

function setup(onDismiss?: () => void) {
	const onUndo = vi.fn();
	const onClose = vi.fn();

	render(
		<CornerSheet
			open
			title="在庫から3件を引きました"
			onDismiss={onDismiss}
			left={{ label: "元に戻す", icon: "undo", onClick: onUndo }}
			right={{ label: "閉じる", icon: "check", onClick: onClose }}
		>
			<p>本文</p>
		</CornerSheet>,
	);

	return { onUndo, onClose };
}

afterEach(() => {
	vi.useRealTimers();
});

describe("CornerSheet", () => {
	it("左を省略すると、「元に戻す」は出ない", () => {
		render(
			<CornerSheet
				open
				title="元に戻しました"
				right={{ label: "閉じる", icon: "check", onClick: vi.fn() }}
			>
				<p>本文</p>
			</CornerSheet>,
		);

		expect(screen.queryByRole("button", { name: "元に戻す" })).toBeNull();
		expect(screen.getByRole("button", { name: "閉じる" })).toBeVisible();
	});

	it("Esc と暗幕は、onDismiss だけを呼ぶ（左のボタンの操作は、呼ばない）", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn();
		const { onUndo } = setup(onDismiss);

		await user.keyboard("{Escape}");
		await user.click(
			document.querySelector('[aria-hidden="true"]') as HTMLElement,
		);

		expect(onDismiss).toHaveBeenCalledTimes(2);
		expect(onUndo).not.toHaveBeenCalled();
	});

	it("候補を開いている入力欄（combobox）の Esc では閉じない。候補を閉じていれば、閉じる", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn();

		const { rerender } = render(
			<CornerSheet
				open
				title="買うものを入れる"
				onDismiss={onDismiss}
				right={{ label: "入れる", icon: "check", onClick: vi.fn() }}
			>
				<input
					aria-label="食材名"
					role="combobox"
					aria-controls="list"
					aria-expanded
				/>
			</CornerSheet>,
		);

		await user.click(screen.getByLabelText("食材名"));
		await user.keyboard("{Escape}");
		expect(onDismiss).not.toHaveBeenCalled();

		rerender(
			<CornerSheet
				open
				title="買うものを入れる"
				onDismiss={onDismiss}
				right={{ label: "入れる", icon: "check", onClick: vi.fn() }}
			>
				<input
					aria-label="食材名"
					role="combobox"
					aria-controls="list"
					aria-expanded={false}
				/>
			</CornerSheet>,
		);
		await user.keyboard("{Escape}");
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("onDismiss がなければ、Esc も暗幕も、何も起こさない", async () => {
		const user = userEvent.setup();
		const { onUndo, onClose } = setup();

		await user.keyboard("{Escape}");

		expect(onUndo).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("左右のボタンは、それぞれの操作を呼ぶ", async () => {
		const user = userEvent.setup();
		const { onUndo, onClose } = setup();

		await user.click(screen.getByRole("button", { name: "元に戻す" }));
		await user.click(screen.getByRole("button", { name: "閉じる" }));

		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("カードの下のボタンは、状態を受け取り、処理中は押せず、失敗を伝える", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		const sheet = (status: "idle" | "pending" | "error") => (
			<CornerSheet
				open
				title="直す"
				actions="inline"
				right={{
					label: "保存",
					icon: "check",
					status,
					errorLabel: "保存できませんでした",
					onClick: onSave,
				}}
			>
				<p>本文</p>
			</CornerSheet>
		);
		const { rerender } = render(sheet("idle"));

		rerender(sheet("pending"));
		const button = screen.getByRole("button", { name: /保存/u });
		expect(button).toHaveAttribute("aria-busy", "true");
		await user.click(button);
		expect(onSave).not.toHaveBeenCalled();

		rerender(sheet("error"));
		expect(
			await screen.findByText("保存できませんでした", { selector: "output" }),
		).toBeInTheDocument();
	});

	it("スマホで右が結果を見せている間だけ、左はアイコンだけに縮み（押せるまま）、終われば戻る", () => {
		vi.useFakeTimers();
		const onDone = vi.fn();
		const sheet = (status: "idle" | "success") => (
			<CornerSheet
				open
				title="買うものを入れる"
				actions="inline"
				left={{ label: "閉じる", icon: "close", onClick: onDone }}
				right={{ label: "追加", icon: "plus", status, onClick: vi.fn() }}
			>
				<p>本文</p>
			</CornerSheet>
		);
		const { rerender } = render(sheet("idle"));
		const done = () => screen.getByRole("button", { name: "閉じる" });

		expect(done()).toHaveTextContent("閉じる");

		rerender(sheet("success"));
		act(() => {
			vi.advanceTimersByTime(0);
		});
		expect(done()).not.toHaveTextContent("閉じる");
		done().click();
		expect(onDone).toHaveBeenCalledTimes(1);

		act(() => {
			vi.advanceTimersByTime(
				BUTTON_TIMINGS.expandDelayMs + BUTTON_TIMINGS.successHoldMs,
			);
		});
		expect(done()).toHaveTextContent("閉じる");
	});
});
