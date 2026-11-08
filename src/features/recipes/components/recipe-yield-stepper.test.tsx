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

	it("上限の数のときは、増やせない（URL の ?n= の上限を超えて、画面が壊れないように）", () => {
		render(
			<RecipeYieldStepper yieldText="8個" wanted={1000} onChange={vi.fn()} />,
		);

		expect(screen.getByRole("button", { name: "量を増やす" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "量を減らす" })).toBeEnabled();
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

	it("数を打って、Enter か欄から離れたときに確定する。打っている途中は変えない", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<>
				<RecipeYieldStepper
					yieldText="クッキー8個"
					wanted={undefined}
					onChange={onChange}
				/>
				<button type="button">ほか</button>
			</>,
		);

		const input = screen.getByRole("textbox", { name: "できあがりの数" });

		expect(input).toHaveValue("8");

		// 押すと全体が選ばれるので、そのまま打てば置き換わる。
		await user.click(input);
		await user.keyboard("16");
		expect(input).toHaveValue("16");
		expect(onChange).not.toHaveBeenCalled();

		await user.keyboard("{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(16);

		await user.click(input);
		await user.keyboard("24");
		await user.click(screen.getByRole("button", { name: "ほか" }));
		expect(onChange).toHaveBeenLastCalledWith(24);
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it("Esc・読めない数・元の数は、量を変えない（元の数は「変えていない」として伝える）", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<RecipeYieldStepper yieldText="8個" wanted={16} onChange={onChange} />,
		);

		const input = screen.getByRole("textbox", { name: "できあがりの数" });

		await user.click(input);
		await user.keyboard("32{Escape}");
		expect(input).toHaveValue("16");

		await user.click(input);
		await user.keyboard("0{Enter}");
		expect(input).toHaveValue("16");
		expect(onChange).not.toHaveBeenCalled();

		await user.click(input);
		await user.keyboard("8{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(undefined);
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
