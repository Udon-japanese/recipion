import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";

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

	it("完了の表示中でも、続けて押せる（続けて登録するときに、待たされない）", () => {
		const onClick = vi.fn();
		render(
			<Button status="success" onClick={onClick}>
				追加
			</Button>,
		);
		const button = screen.getByRole("button", { name: /追加/u });
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
		vi.useFakeTimers();
		const { rerender } = render(
			<Button status="idle" errorLabel="失敗しました">
				送る
			</Button>,
		);
		rerender(
			<Button status="error" errorLabel="失敗しました">
				送る
			</Button>,
		);
		act(() => {
			vi.advanceTimersByTime(0);
		});
		expect(screen.getByRole("status")).toHaveTextContent("失敗しました");
	});

	it("表示されたときから、すでに完了していたボタンは、完了の文言を出さない（前の操作の結果が、残っているだけ）", () => {
		vi.useFakeTimers();
		render(
			<Button status="success" successLabel="完了しました">
				保存
			</Button>,
		);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(screen.getByRole("status")).not.toHaveTextContent("完了しました");
	});
});
