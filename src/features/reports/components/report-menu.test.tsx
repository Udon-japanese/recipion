import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportMenu } from "./report-menu";

describe("ReportMenu", () => {
	it("「その他」から選ぶと、通報のダイアログを開き、選んだ相手に送る", async () => {
		const user = userEvent.setup();
		const onReportRecipe = vi.fn(async () => "created" as const);
		const onReportUser = vi.fn(async () => "created" as const);

		render(
			<ReportMenu
				onReportRecipe={onReportRecipe}
				onReportUser={onReportUser}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "その他" }));
		await user.click(
			screen.getByRole("menuitem", { name: "作者の名前を通報" }),
		);

		const dialog = screen.getByRole("dialog", { name: "作者の名前を通報" });
		await user.click(within(dialog).getByRole("button", { name: "通報する" }));

		expect(onReportUser).toHaveBeenCalledTimes(1);
		expect(onReportRecipe).not.toHaveBeenCalled();

		expect(await within(dialog).findByText(/通報しました。/u)).toBeTruthy();
	});
});
