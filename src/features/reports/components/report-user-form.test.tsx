import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportUserForm } from "./report-user-form";

describe("ReportUserForm", () => {
	it("理由と内容を送る。送れたら、閉じてお礼を出す", async () => {
		const user = userEvent.setup();
		const onReport = vi.fn(async () => "created" as const);

		render(<ReportUserForm onReport={onReport} />);

		await user.click(
			screen.getByRole("button", { name: "この作者のユーザー名を通報する" }),
		);
		await user.click(screen.getByLabelText("他の人・団体になりすましている"));
		await user.type(
			screen.getByLabelText(/詳しい内容/u),
			"有名なお店の名前です",
		);
		await user.click(screen.getByRole("button", { name: "通報する" }));

		expect(onReport).toHaveBeenCalledWith({
			reason: "impersonation",
			detail: "有名なお店の名前です",
		});
		expect(await screen.findByText(/通報しました/u)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "この作者のユーザー名を通報する" }),
		).toBeInTheDocument();
	});

	it.each([
		["duplicate", "すでに通報しています"],
		["limit", "今日の通報の上限"],
		["not-found", "通報できません"],
		["own-profile", "自分は、通報できません"],
	] as const)(
		"%s のときは、その旨を出し、フォームは開いたまま",
		async (result, text) => {
			const user = userEvent.setup();

			render(<ReportUserForm onReport={async () => result} />);
			await user.click(
				screen.getByRole("button", { name: "この作者のユーザー名を通報する" }),
			);
			await user.click(screen.getByRole("button", { name: "通報する" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(text);
			expect(
				screen.getByRole("button", { name: "通報する" }),
			).toBeInTheDocument();
		},
	);

	it("送れなかったときは、エラーを出す", async () => {
		const user = userEvent.setup();

		render(
			<ReportUserForm onReport={vi.fn().mockRejectedValue(new Error("x"))} />,
		);
		await user.click(
			screen.getByRole("button", { name: "この作者のユーザー名を通報する" }),
		);
		await user.click(screen.getByRole("button", { name: "通報する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"通報できませんでした",
		);
	});
});
