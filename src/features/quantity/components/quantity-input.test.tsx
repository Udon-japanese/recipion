import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuantityInput } from "./quantity-input";

function Harness({ showFractionButtons }: { showFractionButtons?: boolean }) {
	const [value, setValue] = useState("");

	return (
		<>
			<label htmlFor="quantity">数量</label>
			<QuantityInput
				id="quantity"
				value={value}
				onChange={setValue}
				showFractionButtons={showFractionButtons}
			/>
		</>
	);
}

describe("QuantityInput", () => {
	it("分数を入力すると、数値にした結果を示す", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.type(screen.getByLabelText("数量"), "1と1/2");

		expect(screen.getByText("= 1.5")).toBeInTheDocument();
	});

	it("小数・整数のときは、確認の表示を出さない", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.type(screen.getByLabelText("数量"), "0.5");

		expect(screen.queryByText(/^=/u)).toBeNull();
	});

	it("分数のボタンで、1/2などを入力できる", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.click(screen.getByRole("button", { name: "1/2にする" }));

		expect(screen.getByLabelText("数量")).toHaveValue("1/2");
		expect(screen.getByText("= 0.5")).toBeInTheDocument();
	});

	it("ボタンを出さない指定もできる", () => {
		render(<Harness showFractionButtons={false} />);

		expect(screen.queryByRole("button", { name: "1/2にする" })).toBeNull();
	});
});
