import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuantityInput, type QuantityPresetButton } from "./quantity-input";

function Harness({
	unitLabel,
	presetButtons,
	hideUnitFractionButtons,
}: {
	unitLabel?: string;
	presetButtons?: QuantityPresetButton[];
	hideUnitFractionButtons?: boolean;
}) {
	const [value, setValue] = useState("");

	return (
		<>
			<label htmlFor="quantity">数量</label>
			<QuantityInput
				id="quantity"
				value={value}
				onChange={setValue}
				unitLabel={unitLabel}
				presetButtons={presetButtons}
				hideUnitFractionButtons={hideUnitFractionButtons}
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

		render(<Harness unitLabel="本" />);
		await user.click(screen.getByRole("button", { name: "1/2にする" }));

		expect(screen.getByLabelText("数量")).toHaveValue("1/2");
		expect(screen.getByText("= 0.5")).toBeInTheDocument();
	});

	it("単位に合わせたボタンを出す：本は 1/3・1/2・2/3、玉は 1/4・1/3・1/2・3/4", () => {
		const { unmount } = render(<Harness unitLabel="本" />);

		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["1/3", "1/2", "2/3"]);
		unmount();

		render(<Harness unitLabel="玉" />);

		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["1/4", "1/3", "1/2", "3/4"]);
	});

	it("g のボタンは、いまの値に足す（+50 を2回で 100）", async () => {
		const user = userEvent.setup();

		render(<Harness unitLabel="g" />);
		await user.click(screen.getByRole("button", { name: "50を足す" }));
		await user.click(screen.getByRole("button", { name: "50を足す" }));

		expect(screen.getByLabelText("数量")).toHaveValue("100");

		await user.click(screen.getByRole("button", { name: "500を足す" }));

		expect(screen.getByLabelText("数量")).toHaveValue("600");
	});

	it("枚・袋のような端数にしない単位や、単位が空のときは、ボタンを出さない", () => {
		for (const unitLabel of ["枚", "袋", "パック", undefined]) {
			const { unmount } = render(<Harness unitLabel={unitLabel} />);

			expect(screen.queryAllByRole("button")).toHaveLength(0);
			unmount();
		}
	});

	it("決まった値のボタンを、単位のボタンの前に出し、同じ値の単位のボタンは重ねて出さない", async () => {
		const user = userEvent.setup();

		render(
			<Harness
				unitLabel="本"
				presetButtons={[
					{ label: "今ある分", value: "2" },
					{
						label: "1/2本",
						value: "1/2",
						ariaLabel: "前に打った量：1/2本にする",
					},
				]}
			/>,
		);

		const labels = screen
			.getAllByRole("button")
			.map((button) => button.textContent);

		expect(labels).toEqual(["今ある分", "1/2本", "1/3", "2/3"]);

		await user.click(
			screen.getByRole("button", { name: "前に打った量：1/2本にする" }),
		);

		expect(screen.getByLabelText("数量")).toHaveValue("1/2");
	});

	it("hideUnitFractionButtons のとき、単位の端数のボタンは出さず、g の足すボタンと決まった値のボタンは出す", () => {
		const { unmount } = render(
			<Harness
				unitLabel="玉"
				hideUnitFractionButtons
				presetButtons={[{ label: "半分", value: "1 1/2" }]}
			/>,
		);

		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["半分"]);
		unmount();

		render(<Harness unitLabel="g" hideUnitFractionButtons />);

		expect(screen.getAllByRole("button")).toHaveLength(5);
	});
});
