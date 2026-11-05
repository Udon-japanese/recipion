import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeYieldStepper } from "./recipe-yield-stepper";

afterEach(cleanup);

describe("RecipeYieldStepper", () => {
	it("元の量のときは、元に戻すボタンを出さない。1より下には減らせない", () => {
		render(
			<RecipeYieldStepper
				yieldText="1人分"
				wanted={undefined}
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole("status")).toHaveTextContent("1人分");
		expect(screen.getByRole("button", { name: "量を減らす" })).toBeDisabled();
		expect(screen.queryByRole("button", { name: /元の量/u })).toBeNull();
	});

	it("量を変えているときは、元に戻すボタンだけで戻せる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<RecipeYieldStepper yieldText="2人分" wanted={3} onChange={onChange} />,
		);

		expect(screen.getByRole("status")).toHaveTextContent("3人分");

		await user.click(
			screen.getByRole("button", { name: "元の量（2人分）に戻す" }),
		);
		expect(onChange).toHaveBeenLastCalledWith(undefined);

		await user.click(screen.getByRole("button", { name: "量を減らす" }));
		// 元の数に戻る操作は、「変えていない」（undefined）として伝える。
		expect(onChange).toHaveBeenLastCalledWith(undefined);

		await user.click(screen.getByRole("button", { name: "量を増やす" }));
		expect(onChange).toHaveBeenLastCalledWith(4);
	});

	it("数のない量は、操作を出さず、量の文字だけ", () => {
		render(
			<RecipeYieldStepper
				yieldText="作りやすい分量"
				wanted={undefined}
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("作りやすい分量")).toBeInTheDocument();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
