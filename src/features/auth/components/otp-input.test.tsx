import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OtpInput } from "./otp-input";
import { createEmptyDigits } from "./otp-input-logic";

afterEach(cleanup);

function Harness({ onComplete }: { onComplete?: (code: string) => void }) {
	const [digits, setDigits] = useState(createEmptyDigits(6));

	return (
		<>
			<OtpInput
				digits={digits}
				onChange={setDigits}
				onComplete={onComplete}
				label="ログイン用コード（6桁）"
			/>
			<button type="button" onClick={() => setDigits(createEmptyDigits(6))}>
				リセット
			</button>
		</>
	);
}

function input(): HTMLInputElement {
	return screen.getByLabelText("ログイン用コード（6桁）") as HTMLInputElement;
}

// 見た目の枠に出ている桁。
function boxes(): string {
	return [...document.querySelectorAll("[data-otp-box]")]
		.map((box) => box.textContent)
		.join("|");
}

describe("OtpInput", () => {
	it("入力欄は1つで、6 桁を打つと、枠に1桁ずつ出て、完成したときに1度だけ知らせる", async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		expect(screen.getAllByRole("textbox")).toHaveLength(1);

		await user.click(input());
		await user.keyboard("123456");

		expect(boxes()).toBe("1|2|3|4|5|6");
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith("123456");
	});

	it("貼り付け（全桁）で、完成を知らせる。数字以外や空白は、取り除く", async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		await user.click(input());
		await user.paste("246 810");

		expect(boxes()).toBe("2|4|6|8|1|0");
		expect(onComplete).toHaveBeenCalledWith("246810");
		// 変換中ではないので、中身も、数字だけに直る。
		expect(input().value).toBe("246810");
	});

	it("ブラウザや OS の自動入力（1つの欄に、全桁の値が入る）で、完成を知らせる", () => {
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		fireEvent.change(input(), { target: { value: "654321" } });

		expect(boxes()).toBe("6|5|4|3|2|1");
		expect(onComplete).toHaveBeenCalledWith("654321");
	});

	it("数字以外は入れない。全角の数字は半角にする", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(input());
		await user.keyboard("a");

		expect(boxes()).toBe("|||||");

		await user.paste("１２ー３");

		expect(boxes()).toBe("1|2|3|||");
		expect(input().value).toBe("123");
	});

	it("Backspace で、最後の桁を消せる", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(input());
		await user.keyboard("123{Backspace}");

		expect(boxes()).toBe("1|2||||");
	});

	it("日本語入力の変換中：全角の数字でも、枠には半角で出る。入力欄の中身は、変換が確定するまで、書き換えない", () => {
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		const field = input();

		fireEvent.compositionStart(field);
		// 実機（Mac の Chrome・Safari、Windows の Edge）と同じく、変換中の文字が、伸びていく。
		fireEvent.change(field, { target: { value: "１２３" } });

		expect(boxes()).toBe("1|2|3|||");
		expect(field.value).toBe("１２３");

		fireEvent.change(field, { target: { value: "１２３４５６" } });

		// 6 桁になっても、変換が確定するまでは、完成を知らせない
		// （確定前に検証して失敗すると、確定前の文字が、ブラウザに残るため）。
		expect(boxes()).toBe("1|2|3|4|5|6");
		expect(onComplete).not.toHaveBeenCalled();
		expect(field.value).toBe("１２３４５６");

		// 変換が確定したら、中身を数字だけに直して、完成を1度だけ知らせる。
		fireEvent.compositionEnd(field);

		expect(field.value).toBe("123456");
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith("123456");
	});

	it("日本語入力の変換中に桁がそろうと、入力欄の focus を外して、変換を確定させる", async () => {
		const user = userEvent.setup();

		render(<Harness onComplete={vi.fn()} />);

		const field = input();

		await user.click(field);
		fireEvent.compositionStart(field);
		fireEvent.change(field, { target: { value: "１２３４５" } });
		expect(field).toHaveFocus();

		fireEvent.change(field, { target: { value: "１２３４５６" } });
		expect(field).not.toHaveFocus();
	});

	it("変換の確定の知らせが届かない環境でも、少し待って、完成を知らせる", () => {
		vi.useFakeTimers();

		try {
			const onComplete = vi.fn();

			render(<Harness onComplete={onComplete} />);

			const field = input();

			fireEvent.compositionStart(field);
			fireEvent.change(field, { target: { value: "１２３４５６" } });
			expect(onComplete).not.toHaveBeenCalled();

			act(() => {
				vi.advanceTimersByTime(150);
			});

			expect(onComplete).toHaveBeenCalledTimes(1);
			expect(onComplete).toHaveBeenCalledWith("123456");
			expect(field.value).toBe("123456");
		} finally {
			vi.useRealTimers();
		}
	});

	it("変換中に Backspace で打ち間違いを直すと、枠も追従する（完成の知らせは、確定したコードで1度だけ）", () => {
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		const field = input();

		fireEvent.compositionStart(field);
		fireEvent.change(field, { target: { value: "１２３４５５" } });
		fireEvent.change(field, { target: { value: "１２３４５" } });
		fireEvent.change(field, { target: { value: "１２３４５６" } });

		expect(boxes()).toBe("1|2|3|4|5|6");
		expect(onComplete).not.toHaveBeenCalled();

		fireEvent.compositionEnd(field);

		expect(onComplete.mock.calls.map(([code]) => code)).toEqual(["123456"]);
	});

	it("親が値をリセットすると、変換中でも、入力欄の中身も空になり、次に打つ数字が足されない", async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		const field = input();

		fireEvent.compositionStart(field);
		fireEvent.change(field, { target: { value: "１２３４５６" } });
		await user.click(screen.getByRole("button", { name: "リセット" }));

		expect(boxes()).toBe("|||||");
		expect(field.value).toBe("");

		await user.click(field);
		await user.keyboard("987654");

		expect(boxes()).toBe("9|8|7|6|5|4");
		expect(onComplete).toHaveBeenLastCalledWith("987654");
	});
});
