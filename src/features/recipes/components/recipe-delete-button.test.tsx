import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeDeleteButton } from "./recipe-delete-button";

afterEach(cleanup);

describe("RecipeDeleteButton", () => {
	it("開くまでは何も出さない", () => {
		render(
			<RecipeDeleteButton open={false} onClose={() => {}} onDelete={vi.fn()} />,
		);

		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("確認のあとに削除し、キャンセルでは削除しない", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn(async () => {});
		const onClose = vi.fn();

		render(<RecipeDeleteButton open onClose={onClose} onDelete={onDelete} />);

		expect(screen.getByText(/元に戻せません/u)).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "キャンセル" }));
		expect(onDelete).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "削除する" }));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("削除に失敗したら、理由を表示して、やり直せる", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn(async () => {
			throw new Error("レシピが見つかりません");
		});

		render(<RecipeDeleteButton open onClose={() => {}} onDelete={onDelete} />);

		await user.click(screen.getByRole("button", { name: "削除する" }));

		expect((await screen.findByRole("alert")).textContent).toBe(
			"レシピが見つかりません",
		);
		expect(screen.getByRole("button", { name: "削除する" })).toBeTruthy();
	});
});
