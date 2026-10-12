import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingRepository } from "../application/shopping-repository";
import { ShoppingList } from "./shopping-list";

function createRepository(): ShoppingRepository {
	return {
		list: vi.fn().mockResolvedValue([]),
		findById: vi.fn().mockResolvedValue(undefined),
		save: vi.fn().mockResolvedValue(undefined),
		saveAll: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
	};
}

beforeEach(async () => {
	const database = getLocalDatabase();

	await database.shoppingStores.clear();
	await database.shoppingStoreDefaults.clear();
});

afterEach(() => {
	localStorage.clear();
});

describe("ShoppingList の店", () => {
	it("その場で店を作って項目に付け、次に同じ食材を入れると、その店が初期値になり、店ごとの表示に出る", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "卵");
		await user.selectOptions(
			screen.getByLabelText("買う店"),
			"＋ 新しい店を追加…",
		);
		await user.type(screen.getByLabelText("新しい店の名前"), "スーパーA");
		await user.click(screen.getByRole("button", { name: "この店を追加" }));

		await waitFor(() => {
			expect(screen.getByLabelText("買う店")).toHaveDisplayValue("スーパーA");
		});

		await user.click(screen.getByRole("button", { name: "追加" }));

		await waitFor(() => {
			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "卵",
					storeId: expect.any(String),
				}),
			);
		});

		// 記憶したあと、同じ食材を打つと、店が入る。
		await waitFor(async () => {
			await expect(
				getLocalDatabase().shoppingStoreDefaults.count(),
			).resolves.toBe(1);
		});
		await user.type(screen.getByLabelText("買うもの"), "卵");
		expect(screen.getByLabelText("買う店")).toHaveDisplayValue("スーパーA");

		await user.click(screen.getByRole("button", { name: "店ごと" }));

		const heading = screen.getByRole("heading", { name: "スーパーA" });

		expect(
			within(heading.closest("section") as HTMLElement).getByText("卵"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "卵をドラッグして並び替え" }),
		).not.toBeInTheDocument();
	});
});
