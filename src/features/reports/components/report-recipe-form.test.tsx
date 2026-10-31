import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportRecipeForm } from "./report-recipe-form";

describe("ReportRecipeForm", () => {
	it("理由と内容を送る。送れたら、お礼と「閉じる」に替わる", async () => {
		const user = userEvent.setup();
		const onReport = vi.fn(async () => "created" as const);
		const onClose = vi.fn();

		render(<ReportRecipeForm onReport={onReport} onClose={onClose} />);

		await user.click(screen.getByLabelText("権利を侵害している"));
		await user.type(screen.getByLabelText(/詳しい内容/u), "転載です");
		await user.click(screen.getByRole("button", { name: "通報する" }));

		expect(onReport).toHaveBeenCalledWith({
			reason: "copyright",
			detail: "転載です",
		});
		expect(await screen.findByText(/通報しました。/u)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "閉じる" }));

		expect(onClose).toHaveBeenCalled();
	});

	it("すでに通報していれば、その旨を出す（フォームは開いたまま）", async () => {
		const user = userEvent.setup();

		render(
			<ReportRecipeForm onReport={async () => "duplicate"} onClose={vi.fn()} />,
		);
		await user.click(screen.getByRole("button", { name: "通報する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"すでに通報しています",
		);
		expect(
			screen.getByRole("button", { name: "通報する" }),
		).toBeInTheDocument();
	});
});
