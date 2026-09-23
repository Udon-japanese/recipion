import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InventoryList } from "./inventory-list";

describe("InventoryList", () => {
	it("ログインユーザーの在庫を表示する", async () => {
		const loadInventoryItems = vi.fn().mockResolvedValue([
			{
				inventoryItemId: "inventory-id",
				ingredientId: "ingredient-id",
				name: "卵",
				quantity: 6,
				stockUnitCode: "count",
				stockUnitLabel: "個",
				trackingMode: "exact",
				updatedAt: "2026-09-23T00:00:00.000Z",
			},
			{
				inventoryItemId: "milk-inventory-id",
				ingredientId: "milk-ingredient-id",
				name: "牛乳",
				quantity: 800,
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				trackingMode: "estimated",
				updatedAt: "2026-09-23T00:00:00.000Z",
			},
		]);

		render(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={loadInventoryItems}
			/>,
		);

		expect(await screen.findByText("卵")).toBeInTheDocument();

		expect(screen.getByText("6個")).toBeInTheDocument();
		expect(screen.getByText("約 800ml")).toBeInTheDocument();
	});

	it("ゲストでは在庫を取得しない", () => {
		const loadInventoryItems = vi.fn();

		render(
			<InventoryList
				ownerScope="guest"
				loadInventoryItems={loadInventoryItems}
			/>,
		);

		expect(
			screen.getByText("ログインすると在庫を確認できます。"),
		).toBeInTheDocument();

		expect(loadInventoryItems).not.toHaveBeenCalled();
	});

	it("在庫がなければ空表示する", async () => {
		render(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={() => Promise.resolve([])}
			/>,
		);

		expect(
			await screen.findByText("在庫はまだありません。"),
		).toBeInTheDocument();
	});

	it("読み込みに失敗したら再試行できる", async () => {
		const user = userEvent.setup();

		const loadInventoryItems = vi
			.fn()
			.mockRejectedValueOnce(new Error("failed"))
			.mockResolvedValueOnce([]);

		render(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={loadInventoryItems}
			/>,
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"在庫を読み込めませんでした",
		);

		await user.click(
			screen.getByRole("button", {
				name: "更新",
			}),
		);

		await waitFor(() => {
			expect(loadInventoryItems).toHaveBeenCalledTimes(2);
		});

		expect(
			await screen.findByText("在庫はまだありません。"),
		).toBeInTheDocument();
	});
});
