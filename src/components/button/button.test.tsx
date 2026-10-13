import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { BUTTON_TIMINGS } from "./use-button-phase";

afterEach(() => {
	vi.useRealTimers();
});

describe("Button", () => {
	it("ふつうのボタンとして押せる", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>保存</Button>);

		await userEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("disabled のときは押せない", async () => {
		const onClick = vi.fn();
		render(
			<Button onClick={onClick} disabled>
				保存
			</Button>,
		);

		const button = screen.getByRole("button", { name: "保存" });
		expect(button).toBeDisabled();
		await userEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("処理中は、押せず（二重送信の防止）、状態を伝える", async () => {
		const onClick = vi.fn();
		render(
			<Button status="pending" onClick={onClick} pendingLabel="送信中">
				送る
			</Button>,
		);

		const button = screen.getByRole("button", { name: "送る" });
		expect(button).toHaveAttribute("aria-busy", "true");
		expect(button).toHaveAttribute("aria-disabled", "true");
		// フォーカスを失わないよう、disabled にはしない。
		expect(button).not.toBeDisabled();
		expect(screen.getByRole("status")).toHaveTextContent("送信中");

		await userEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("処理中は、フォームの送信も止める", async () => {
		const onSubmit = vi.fn((event: { preventDefault: () => void }) =>
			event.preventDefault(),
		);
		render(
			<form onSubmit={onSubmit}>
				<Button type="submit" status="pending">
					送る
				</Button>
			</form>,
		);

		await userEvent.click(screen.getByRole("button", { name: "送る" }));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("ラベルは、状態が変わっても同じ名前で探せる", () => {
		vi.useFakeTimers();
		const { rerender } = render(<Button status="idle">追加</Button>);
		rerender(
			<Button status="success" successLabel="追加しました">
				追加
			</Button>,
		);

		expect(screen.getByRole("button", { name: /追加/u })).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(0);
		});
		expect(screen.getByRole("status")).toHaveTextContent("追加しました");
	});

	it("完了の表示が終わって元に戻れば、また押せる", async () => {
		vi.useFakeTimers();
		const onClick = vi.fn();
		render(
			<Button status="success" onClick={onClick}>
				追加
			</Button>,
		);
		const button = screen.getByRole("button", { name: /追加/u });
		expect(button).toHaveAttribute("aria-disabled", "true");

		act(() => {
			vi.advanceTimersByTime(
				BUTTON_TIMINGS.expandDelayMs + BUTTON_TIMINGS.successHoldMs,
			);
		});
		expect(button).not.toHaveAttribute("aria-disabled");

		button.click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("失敗の表示中でも、すぐにやり直せる", () => {
		const onClick = vi.fn();
		render(
			<Button status="error" onClick={onClick}>
				送る
			</Button>,
		);
		const button = screen.getByRole("button", { name: /送る/u });
		expect(button).not.toHaveAttribute("aria-disabled");

		button.click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("失敗は、失敗の文言を伝える", () => {
		render(
			<Button status="error" errorLabel="失敗しました">
				送る
			</Button>,
		);
		expect(screen.getByRole("status")).toHaveTextContent("失敗しました");
	});
});
