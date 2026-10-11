import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SuspendedScreen } from "./suspended-screen";

describe("SuspendedScreen", () => {
	it("停止中は申し立てを送れる。送ったあとは、欄が空になり、続けて送れる", async () => {
		const user = userEvent.setup();
		const onSubmitAppeal = vi.fn(async () => ({ status: "submitted" }));

		render(
			<SuspendedScreen status="suspended" onSubmitAppeal={onSubmitAppeal} />,
		);

		await user.type(screen.getByLabelText("申し立ての内容"), "誤判定です");
		await user.click(screen.getByRole("button", { name: "申し立てを送る" }));

		expect(onSubmitAppeal).toHaveBeenCalledWith("誤判定です");
		expect(
			await screen.findByText(/申し立てを送りました/u),
		).toBeInTheDocument();
		expect(screen.getByLabelText("申し立ての内容")).toHaveValue("");
	});

	it("空の申し立ては送らない", async () => {
		const user = userEvent.setup();
		const onSubmitAppeal = vi.fn(async () => ({ status: "submitted" }));

		render(
			<SuspendedScreen status="suspended" onSubmitAppeal={onSubmitAppeal} />,
		);
		await user.click(screen.getByRole("button", { name: "申し立てを送る" }));

		expect(onSubmitAppeal).not.toHaveBeenCalled();
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("永久停止のときは、申し立ての欄を出さない", () => {
		render(<SuspendedScreen status="banned" onSubmitAppeal={vi.fn()} />);

		expect(screen.queryByLabelText("申し立ての内容")).toBeNull();
		expect(screen.getByText(/永久に停止/u)).toBeInTheDocument();
	});
});
