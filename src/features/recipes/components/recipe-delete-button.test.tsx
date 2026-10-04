import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeDeleteButton } from "./recipe-delete-button";

afterEach(cleanup);

describe("RecipeDeleteButton", () => {
	it("確認するまでは削除せず、確認のあとに削除する", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn(async () => {});

		render(<RecipeDeleteButton onDelete={onDelete} />);

		await user.click(screen.getByRole("button", { name: "削除" }));
		expect(onDelete).not.toHaveBeenCalled();
		expect(screen.getByText(/元に戻せません/u)).toBeTruthy();

		// キャンセルすると、最初の状態に戻る
		await user.click(screen.getByRole("button", { name: "キャンセル" }));
		expect(onDelete).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "削除" }));
		await user.click(screen.getByRole("button", { name: "削除する" }));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("削除に失敗したら、理由を表示して、確認の状態に戻る", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn(async () => {
			throw new Error("レシピが見つかりません");
		});

		render(<RecipeDeleteButton onDelete={onDelete} />);

		await user.click(screen.getByRole("button", { name: "削除" }));
		await user.click(screen.getByRole("button", { name: "削除する" }));

		expect((await screen.findByRole("alert")).textContent).toBe(
			"レシピが見つかりません",
		);
		// 再度、試せる
		expect(screen.getByRole("button", { name: "削除する" })).toBeTruthy();
	});
});
