import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InventoryListItem } from "../application/inventory-query-repository";
import type { InventoryLot } from "../domain/inventory-lot";
import { InventoryList } from "./inventory-list";

function createLot(
	overrides: Partial<InventoryLot> & { id: string; quantity: number },
): InventoryLot {
	return {
		acquiredOn: "2026-10-01",
		storage: null,
		expiresOn: null,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-10-01T00:00:00.000Z",
		...overrides,
	};
}

function createNetworkResult(items: InventoryListItem[]) {
	return {
		items,
		source: "network" as const,
		cachedAt: "2026-09-23T00:00:00.000Z",
	};
}

describe("InventoryList", () => {
	it("ログインユーザーの在庫を表示する", async () => {
		const loadInventoryItems = vi.fn().mockResolvedValue(
			createNetworkResult([
				{
					inventoryItemId: "inventory-id",
					ingredientId: "ingredient-id",
					name: "卵",
					quantity: 6,
					lots: [],
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
					lots: [],
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
					trackingMode: "estimated",
					updatedAt: "2026-09-23T00:00:00.000Z",
				},
			]),
		);

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
				loadInventoryItems={() => Promise.resolve(createNetworkResult([]))}
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
			.mockResolvedValueOnce(createNetworkResult([]));

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

	it("在庫数量を手動で増やせる", async () => {
		const user = userEvent.setup();

		const adjustInventoryItem = vi.fn().mockResolvedValue({
			status: "applied",
			transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
			quantity: 8,
			lots: [],
		});

		render(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={() =>
					Promise.resolve(
						createNetworkResult([
							{
								inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
								ingredientId: "9af9c3eb-1ed5-485c-923e-ddda59dc4190",
								name: "卵",
								quantity: 6,
								lots: [],
								stockUnitCode: "count",
								stockUnitLabel: "個",
								trackingMode: "exact",
								updatedAt: "2026-09-23T00:00:00.000Z",
							},
						]),
					)
				}
				adjustInventoryItem={adjustInventoryItem}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "調整",
			}),
		);

		await user.clear(screen.getByLabelText("卵の調整数量"));

		await user.type(screen.getByLabelText("卵の調整数量"), "2");

		await user.click(
			screen.getByRole("button", {
				name: "増やす",
			}),
		);

		await waitFor(() => {
			expect(adjustInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
					inputQuantity: 2,
					inputUnitCode: "count",
					stockQuantityPerInputUnit: 1,
					operation: "increase",
					reason: "manual-adjustment",
				}),
			);
		});

		expect(await screen.findByText("8個")).toBeInTheDocument();
	});

	it("更新番号が変わると在庫を再取得する", async () => {
		const loadInventoryItems = vi
			.fn()
			.mockResolvedValue(createNetworkResult([]));

		const { rerender } = render(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={loadInventoryItems}
				refreshKey={0}
			/>,
		);

		await waitFor(() => {
			expect(loadInventoryItems).toHaveBeenCalledTimes(1);
		});

		rerender(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={loadInventoryItems}
				refreshKey={1}
			/>,
		);

		await waitFor(() => {
			expect(loadInventoryItems).toHaveBeenCalledTimes(2);
		});
	});

	it("通信に失敗した場合は保存済みの在庫だと案内する", async () => {
		render(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={() =>
					Promise.resolve({
						items: [
							{
								inventoryItemId: "inventory-id",
								ingredientId: "ingredient-id",
								name: "卵",
								quantity: 6,
								lots: [],
								stockUnitCode: "count",
								stockUnitLabel: "個",
								trackingMode: "exact",
								updatedAt: "2026-09-23T00:00:00.000Z",
							},
						],
						source: "cache",
						cachedAt: "2026-09-23T10:00:00.000Z",
					})
				}
				adjustInventoryItem={vi.fn()}
			/>,
		);

		expect(
			await screen.findByText(
				/通信できないため、保存済みの在庫を表示しています/,
			),
		).toBeInTheDocument();

		expect(
			screen.getByRole("button", {
				name: "調整",
			}),
		).toBeDisabled();
	});

	describe("ロット", () => {
		const eggItem: InventoryListItem = {
			inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
			ingredientId: "9af9c3eb-1ed5-485c-923e-ddda59dc4190",
			name: "卵",
			quantity: 5,
			lots: [
				createLot({
					id: "6b1d4f0e-0a0e-4c85-9a3f-111111111111",
					quantity: 2,
					acquiredOn: "2026-10-01",
				}),
				createLot({
					id: "6b1d4f0e-0a0e-4c85-9a3f-222222222222",
					quantity: 3,
					acquiredOn: "2026-10-03",
				}),
			],
			stockUnitCode: "count",
			stockUnitLabel: "個",
			trackingMode: "exact",
			updatedAt: "2026-10-03T00:00:00.000Z",
		};

		it("食材ごとにまとめて、その中に、ロットごとの追加日と数量を表示する", async () => {
			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={() =>
						Promise.resolve(createNetworkResult([eggItem]))
					}
				/>,
			);

			expect(await screen.findByText("5個")).toBeInTheDocument();

			const lots = within(screen.getByRole("list", { name: "卵のロット" }));

			expect(lots.getByText("10/1に追加")).toBeInTheDocument();
			expect(lots.getByText("2個")).toBeInTheDocument();
			expect(lots.getByText("10/3に追加")).toBeInTheDocument();
			expect(lots.getByText("3個")).toBeInTheDocument();
		});

		it("ロットを指定して減らすと、ロットごとの数量を送り、結果のロットを表示する", async () => {
			const user = userEvent.setup();
			const adjustInventoryItem = vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
				quantity: 3,
				lots: [
					createLot({
						id: "6b1d4f0e-0a0e-4c85-9a3f-111111111111",
						quantity: 1,
						acquiredOn: "2026-10-01",
					}),
					createLot({
						id: "6b1d4f0e-0a0e-4c85-9a3f-222222222222",
						quantity: 2,
						acquiredOn: "2026-10-03",
					}),
				],
			});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={() =>
						Promise.resolve(createNetworkResult([eggItem]))
					}
					adjustInventoryItem={adjustInventoryItem}
				/>,
			);

			await user.click(await screen.findByRole("button", { name: "調整" }));
			await user.click(screen.getByLabelText("ロットを指定して減らす"));
			await user.type(
				screen.getByLabelText("10/1に追加のロットから減らす数量"),
				"1",
			);
			await user.type(
				screen.getByLabelText("10/3に追加のロットから減らす数量"),
				"1",
			);
			await user.click(screen.getByRole("button", { name: "減らす" }));

			await waitFor(() =>
				expect(adjustInventoryItem).toHaveBeenCalledWith(
					expect.objectContaining({
						operation: "decrease",
						inputQuantity: 2,
						allocations: [
							{ lotId: "6b1d4f0e-0a0e-4c85-9a3f-111111111111", quantity: 1 },
							{ lotId: "6b1d4f0e-0a0e-4c85-9a3f-222222222222", quantity: 1 },
						],
					}),
				),
			);

			expect(await screen.findByText("3個")).toBeInTheDocument();
		});

		it("ロットが1つだけなら、ロットの指定は出さない", async () => {
			const user = userEvent.setup();

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={() =>
						Promise.resolve(
							createNetworkResult([
								{ ...eggItem, quantity: 2, lots: eggItem.lots.slice(0, 1) },
							]),
						)
					}
					adjustInventoryItem={vi.fn()}
				/>,
			);

			await user.click(await screen.findByRole("button", { name: "調整" }));

			expect(screen.queryByLabelText("ロットを指定して減らす")).toBeNull();
		});
	});
});
