import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OtpInput } from "./otp-input";
import { createEmptyDigits } from "./otp-input-logic";

afterEach(cleanup);

function Harness({ onComplete }: { onComplete?: (code: string) => void }) {
	const [digits, setDigits] = useState(createEmptyDigits(6));

	return (
		<OtpInput
			digits={digits}
			onChange={setDigits}
			onComplete={onComplete}
			label="ログイン用コード（6桁）"
		/>
	);
}

function boxes(): HTMLInputElement[] {
	return screen.getAllByRole("textbox") as HTMLInputElement[];
}

function values(): string {
	return boxes()
		.map((box) => box.value)
		.join("|");
}

describe("OtpInput", () => {
	it("1 桁ずつ別の欄で、6 桁を打つと、欄が順に移り、完成したときに知らせる", async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		await user.click(boxes()[0] as HTMLInputElement);
		await user.keyboard("123456");

		expect(values()).toBe("1|2|3|4|5|6");
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith("123456");
	});

	it("途中まで打つと、次の欄にフォーカスがある", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(boxes()[0] as HTMLInputElement);
		await user.keyboard("12");

		expect(document.activeElement).toBe(boxes()[2]);
	});

	it("貼り付けると、全桁に振り分けて、完成を知らせる", async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		await user.click(boxes()[0] as HTMLInputElement);
		await user.paste("246810");

		expect(values()).toBe("2|4|6|8|1|0");
		expect(onComplete).toHaveBeenCalledWith("246810");
	});

	it("途中の欄に全桁を貼り付けても、先頭から振り分ける", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(boxes()[3] as HTMLInputElement);
		await user.paste("135790");

		expect(values()).toBe("1|3|5|7|9|0");
	});

	it("ブラウザや OS の自動入力（1 つの欄に、全桁の値が入る）を、全桁に振り分ける", () => {
		const onComplete = vi.fn();

		render(<Harness onComplete={onComplete} />);

		fireEvent.change(boxes()[0] as HTMLInputElement, {
			target: { value: "654321" },
		});

		expect(values()).toBe("6|5|4|3|2|1");
		expect(onComplete).toHaveBeenCalledWith("654321");
	});

	it("全角の数字は半角にし、数字以外は入れない", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(boxes()[0] as HTMLInputElement);
		await user.keyboard("a");
		expect(values()).toBe("|||||");

		await user.paste("１２ー３");
		expect(values()).toBe("1|2|3|||");
	});

	it("空の欄で Backspace を押すと、前の欄に戻って、その数字を消す", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(boxes()[0] as HTMLInputElement);
		await user.keyboard("12");
		// 3 桁目の（空の）欄にいる
		await user.keyboard("{Backspace}");

		expect(values()).toBe("1|||||");
		expect(document.activeElement).toBe(boxes()[1]);
	});

	it("数字のある欄で Backspace を押すと、その数字だけを消して、その欄にとどまる", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(boxes()[0] as HTMLInputElement);
		await user.keyboard("123");
		await user.click(boxes()[1] as HTMLInputElement);
		await user.keyboard("{Backspace}");

		expect(values()).toBe("1||3|||");
		expect(document.activeElement).toBe(boxes()[1]);
	});

	it("矢印キーで、前後の欄に移動できる", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.click(boxes()[2] as HTMLInputElement);
		await user.keyboard("{ArrowLeft}");
		expect(document.activeElement).toBe(boxes()[1]);

		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(document.activeElement).toBe(boxes()[3]);
	});

	it("自動入力に対応する属性と、読み上げ用の名前が付いている", () => {
		render(<Harness />);

		expect(
			screen.getByRole("group", { name: "ログイン用コード（6桁）" }),
		).toBeTruthy();

		boxes().forEach((box, index) => {
			expect(box.getAttribute("autocomplete")).toBe("one-time-code");
			expect(box.getAttribute("inputmode")).toBe("numeric");
			expect(box.getAttribute("aria-label")).toBe(`${index + 1}桁目`);
		});
	});
});
