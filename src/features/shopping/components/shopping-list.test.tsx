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
	categoryId: "eggs",
	status: "pending",
	sortOrder: 0,
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
		saveAll: vi.fn().mockResolvedValue(undefined),
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
		await user.type(screen.getByLabelText("買うもの"), "卵");
		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "6");
		await user.type(screen.getByLabelText("単位"), "個");
		await user.click(screen.getByRole("button", { name: "追加" }));

		await waitFor(() => {
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "卵",
					quantity: 6,
					unitLabel: "個",
					status: "pending",
				}),
			);
		});

		expect(
			screen.getByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeInTheDocument();

		expect(screen.getByLabelText("買うもの")).toHaveValue("");
		expect(screen.getByLabelText("数量")).toHaveValue(1);
		expect(screen.getByLabelText("単位")).toHaveValue("");
		expect(screen.getByLabelText("カテゴリ")).toHaveValue("");
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

	it("0以下の数量を追加しない", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "牛乳");
		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "0");
		await user.click(screen.getByRole("button", { name: "追加" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"数量は0より大きい数にしてください",
		);
		expect(repository.save).not.toHaveBeenCalled();
	});

	it("商品名に応じた数量プリセットを選択できる", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "卵");

		const sixEggsButton = screen.getByRole("button", {
			name: "6個",
		});

		expect(sixEggsButton).toHaveAttribute("aria-pressed", "false");

		await user.click(sixEggsButton);

		expect(screen.getByLabelText("数量")).toHaveValue(6);
		expect(screen.getByLabelText("単位")).toHaveValue("個");
		expect(sixEggsButton).toHaveAttribute("aria-pressed", "true");
	});

	it("買い物項目を上下に並び替えられる", async () => {
		const user = userEvent.setup();
		const secondItem: ShoppingItem = {
			...storedItem,
			id: "item-2",
			name: "牛乳",
			quantity: 1,
			unitLabel: "本",
			sortOrder: 1,
		};

		const repository = createRepository({
			list: vi.fn().mockResolvedValue([
				{
					...storedItem,
					sortOrder: 0,
				},
				secondItem,
			]),
		});

		render(<ShoppingList repository={repository} />);

		const moveDownButton = await screen.findByRole("button", {
			name: "卵を下へ",
		});

		expect(
			screen.getByRole("button", {
				name: "卵を上へ",
			}),
		).toBeDisabled();

		expect(
			screen.getByRole("button", {
				name: "牛乳を下へ",
			}),
		).toBeDisabled();

		await user.click(moveDownButton);

		await waitFor(() => {
			expect(repository.saveAll).toHaveBeenCalledWith([
				expect.objectContaining({
					id: secondItem.id,
					sortOrder: 0,
				}),
				expect.objectContaining({
					id: storedItem.id,
					sortOrder: 1,
				}),
			]);
		});

		await waitFor(() => {
			expect(
				screen
					.getAllByRole("checkbox")
					.map((checkbox) => checkbox.getAttribute("aria-label")),
			).toEqual(["牛乳をチェック", "卵をチェック"]);
		});
	});

	it("商品名からカテゴリを自動選択する", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "タマゴ");

		expect(screen.getByLabelText("カテゴリ")).toHaveValue("eggs");

		await user.click(
			screen.getByRole("button", {
				name: "追加",
			}),
		);

		await waitFor(() => {
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "タマゴ",
					categoryId: "eggs",
				}),
			);
		});
	});

	it("手動で選択したカテゴリを商品名で上書きしない", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");

		await user.selectOptions(screen.getByLabelText("カテゴリ"), "pantry");
		await user.type(screen.getByLabelText("買うもの"), "卵");

		expect(screen.getByLabelText("カテゴリ")).toHaveValue("pantry");
	});
});
