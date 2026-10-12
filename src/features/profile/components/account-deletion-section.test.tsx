import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountDeletionSection } from "./account-deletion-section";

describe("AccountDeletionSection", () => {
	it("ハンドルを正しく入力するまで、メールを送れない。送れたら案内を出す", async () => {
		const user = userEvent.setup();
		const onRequestDeletion = vi.fn(async () => true);

		render(
			<AccountDeletionSection
				handle="user-abc123"
				onRequestDeletion={onRequestDeletion}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "アカウントを削除する" }),
		);

		const send = screen.getByRole("button", { name: "確認のメールを送る" });

		expect(send).toBeDisabled();

		await user.type(screen.getByLabelText(/ハンドル/u), "user-abc12");

		expect(send).toBeDisabled();

		await user.type(screen.getByLabelText(/ハンドル/u), "3");
		await user.click(send);

		expect(onRequestDeletion).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText(/確認のメールを送りました/u),
		).toBeInTheDocument();
	});

	it("送れなかったときは、その旨を出して、やり直せる。やめるで戻れる", async () => {
		const user = userEvent.setup();

		render(
			<AccountDeletionSection
				handle="user-abc123"
				onRequestDeletion={async () => false}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "アカウントを削除する" }),
		);
		await user.type(screen.getByLabelText(/ハンドル/u), "user-abc123");
		await user.click(
			screen.getByRole("button", { name: "確認のメールを送る" }),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"送れませんでした",
		);

		await user.click(screen.getByRole("button", { name: "やめる" }));

		expect(
			screen.getByRole("button", { name: "アカウントを削除する" }),
		).toBeInTheDocument();
	});
});
