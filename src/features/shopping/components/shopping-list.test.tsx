import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ShoppingItem } from "../domain/shopping-item";
import { ShoppingList } from "./shopping-list";

const storedItem: ShoppingItem = {
	id: "item-1",
	name: "卵",
	quantity: 6,
	unitLabel: "個",
	status: "pending",
	createdAt: "2026-09-21T10:00:00.000Z",
	updatedAt: "2026-09-21T10:00:00.000Z",
};

function createRepository(
	overrides: Partial<ShoppingRepository> = {},
): ShoppingRepository {
	return {
		list: vi.fn().mockResolvedValue([]),
		findById: vi.fn().mockResolvedValue(undefined),
		save: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("ShoppingList", () => {
	it("保存済みの買い物項目を表示する", async () => {
		const repository = createRepository({
			list: vi.fn().mockResolvedValue([storedItem]),
		});

		render(<ShoppingList repository={repository} />);

		expect(
			await screen.findByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeInTheDocument();

		expect(screen.getByText("6個")).toBeInTheDocument();
	});

	it("買い物項目を追加する", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "牛乳");
		await user.click(screen.getByRole("button", { name: "追加" }));

		await waitFor(() => {
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "牛乳",
					quantity: 1,
					status: "pending",
				}),
			);
		});

		expect(
			screen.getByRole("checkbox", {
				name: "牛乳をチェック",
			}),
		).toBeInTheDocument();

		expect(screen.getByLabelText("買うもの")).toHaveValue("");
	});

	it("買い物項目のチェック状態を切り替える", async () => {
		const user = userEvent.setup();
		const repository = createRepository({
			list: vi.fn().mockResolvedValue([storedItem]),
		});

		render(<ShoppingList repository={repository} />);

		const checkbox = await screen.findByRole("checkbox", {
			name: "卵をチェック",
		});

		await user.click(checkbox);

		await waitFor(() => {
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					id: storedItem.id,
					status: "checked",
				}),
			);
		});

		expect(checkbox).toBeChecked();
	});

	it("買い物項目を削除する", async () => {
		const user = userEvent.setup();
		const repository = createRepository({
			list: vi.fn().mockResolvedValue([storedItem]),
		});

		render(<ShoppingList repository={repository} />);

		await user.click(
			await screen.findByRole("button", {
				name: "卵を削除",
			}),
		);

		await waitFor(() => {
			expect(repository.remove).toHaveBeenCalledWith(storedItem.id);
		});

		expect(
			screen.queryByRole("checkbox", {
				name: "卵をチェック",
			}),
		).not.toBeInTheDocument();
	});

	it("読み込みに失敗した場合はエラーを表示する", async () => {
		const repository = createRepository({
			list: vi.fn().mockRejectedValue(new Error("failed")),
		});

		render(<ShoppingList repository={repository} />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"買い物メモを読み込めませんでした",
		);
	});
});
