import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import type { InventoryListItem } from "../application/inventory-query-repository";
import {
	addDays,
	type InventoryLot,
	toDateString,
} from "../domain/inventory-lot";
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
					displayName: null,
					quantity: 6,
					lots: [],
					stockUnitCode: "count",
					stockUnitLabel: "個",
					trackingMode: "exact",
					defaultExpiryKind: null,
					defaultStorage: null,
					updatedAt: "2026-09-23T00:00:00.000Z",
				},
				{
					inventoryItemId: "milk-inventory-id",
					ingredientId: "milk-ingredient-id",
					name: "牛乳",
					displayName: null,
					quantity: 800,
					lots: [],
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
					trackingMode: "estimated",
					defaultExpiryKind: null,
					defaultStorage: null,
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
								displayName: null,
								quantity: 6,
								lots: [],
								stockUnitCode: "count",
								stockUnitLabel: "個",
								trackingMode: "exact",
								defaultExpiryKind: null,
								defaultStorage: null,
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
								displayName: null,
								quantity: 6,
								lots: [],
								stockUnitCode: "count",
								stockUnitLabel: "個",
								trackingMode: "exact",
								defaultExpiryKind: null,
								defaultStorage: null,
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
			displayName: null,
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
			defaultExpiryKind: null,
			defaultStorage: null,
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

		it("期限と保存方法を表示する（目安は「約」付き）", async () => {
			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={() =>
						Promise.resolve(
							createNetworkResult([
								{
									...eggItem,
									lots: [
										createLot({
											id: "6b1d4f0e-0a0e-4c85-9a3f-333333333333",
											quantity: 2,
											storage: "fridge",
											expiresOn: "2026-10-10",
											expiryKind: "use-by",
											expirySource: "estimated",
										}),
										createLot({
											id: "6b1d4f0e-0a0e-4c85-9a3f-444444444444",
											quantity: 3,
											expiresOn: "2026-10-20",
											expiryKind: "best-before",
											expirySource: "entered",
										}),
									],
								},
							]),
						)
					}
				/>,
			);

			const lots = within(
				await screen.findByRole("list", { name: "卵のロット" }),
			);

			expect(lots.getByText("消費期限 約 10/10")).toBeInTheDocument();
			expect(lots.getByText("冷蔵")).toBeInTheDocument();
			expect(lots.getByText("賞味期限 10/20")).toBeInTheDocument();
		});

		it("ロットの期限を直すと、入力として保存する", async () => {
			const user = userEvent.setup();
			const updateInventoryLot = vi.fn().mockResolvedValue({
				inventoryItemId: eggItem.inventoryItemId,
				quantity: 5,
				lots: eggItem.lots,
				defaultExpiryKind: null,
				defaultStorage: null,
			});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={() =>
						Promise.resolve(createNetworkResult([eggItem]))
					}
					updateInventoryLot={updateInventoryLot}
				/>,
			);

			await user.click(
				await screen.findByRole("button", {
					name: "10/1に追加のロットの期限を編集",
				}),
			);
			await user.click(
				screen.getByRole("button", { name: "期限を明日にする" }),
			);
			await user.selectOptions(screen.getByLabelText("期限の種類"), "use-by");
			await user.click(screen.getByLabelText(/この食材の初期値にする/u));
			await user.click(screen.getByRole("button", { name: "保存" }));

			await waitFor(() =>
				expect(updateInventoryLot).toHaveBeenCalledWith({
					lotId: "6b1d4f0e-0a0e-4c85-9a3f-111111111111",
					expiresOn: addDays(toDateString(new Date()), 1),
					expirySource: "entered",
					expiryKind: "use-by",
					storage: null,
					saveAsIngredientDefault: true,
				}),
			);
		});
	});

	describe("有無だけで管理している食材", () => {
		const oilId = "6b1d4f0e-0a0e-4c85-9a3f-111111111111";

		function presenceItem(quantity: number, overrides = {}): InventoryListItem {
			return {
				inventoryItemId: oilId,
				ingredientId: "oil-ingredient",
				name: "オリーブオイル",
				displayName: null,
				quantity,
				lots: quantity > 0 ? [createLot({ id: "lot-1", quantity })] : [],
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				trackingMode: "presence",
				defaultExpiryKind: null,
				defaultStorage: null,
				updatedAt: "2026-09-23T00:00:00.000Z",
				...overrides,
			};
		}

		it("数量を出さず、「あり」だけを表示し、ロットにも数量を出さない", async () => {
			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([presenceItem(1)])
					}
					adjustInventoryItem={vi.fn()}
				/>,
			);

			expect(await screen.findByText("オリーブオイル")).toBeInTheDocument();
			expect(screen.getByText("あり")).toBeInTheDocument();
			expect(screen.queryByText(/\d+\s*ml/u)).toBeNull();
			expect(screen.queryByRole("button", { name: "調整" })).toBeNull();
		});

		it("「なくなった」で「なし」になり、「ある」で「あり」に戻る", async () => {
			const user = userEvent.setup();
			const adjustInventoryItem = vi
				.fn()
				.mockResolvedValueOnce({
					status: "applied",
					transactionId: "t1",
					quantity: 0,
					lots: [],
				})
				.mockResolvedValueOnce({
					status: "applied",
					transactionId: "t2",
					quantity: 1,
					lots: [createLot({ id: "lot-2", quantity: 1 })],
				});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([presenceItem(1)])
					}
					adjustInventoryItem={adjustInventoryItem}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "なくなった" }),
			);

			expect(await screen.findByText("なし")).toBeInTheDocument();
			expect(adjustInventoryItem).toHaveBeenLastCalledWith(
				expect.objectContaining({ operation: "decrease" }),
			);

			await user.click(screen.getByRole("button", { name: "ある" }));

			expect(await screen.findByText("あり")).toBeInTheDocument();
			expect(adjustInventoryItem).toHaveBeenLastCalledWith(
				expect.objectContaining({ operation: "increase" }),
			);
		});

		it("量を追う管理に変えるときは、いまの量を入れてもらう", async () => {
			const user = userEvent.setup();
			const changeTrackingMode = vi.fn().mockResolvedValue({
				inventoryItemId: oilId,
				trackingMode: "estimated",
				quantity: 300,
				lots: [createLot({ id: "lot-1", quantity: 300 })],
			});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([presenceItem(1)])
					}
					changeTrackingMode={changeTrackingMode}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "量を追う管理にする" }),
			);
			await user.type(screen.getByLabelText("オリーブオイルのいまの量"), "300");
			await user.click(
				screen.getByRole("button", { name: "この量で管理する" }),
			);

			// 食材の数量と、ロットの数量
			expect(await screen.findAllByText("約 300ml")).toHaveLength(2);
			expect(changeTrackingMode).toHaveBeenCalledWith({
				inventoryItemId: oilId,
				trackingMode: "estimated",
				currentQuantity: 300,
			});
		});

		it("量を追う食材は、「有無だけにする」で、数量を出さなくなる", async () => {
			const user = userEvent.setup();
			const changeTrackingMode = vi.fn().mockResolvedValue({
				inventoryItemId: oilId,
				trackingMode: "presence",
				quantity: 1,
				lots: [createLot({ id: "lot-1", quantity: 1 })],
			});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([
							presenceItem(300, { trackingMode: "estimated" }),
						])
					}
					changeTrackingMode={changeTrackingMode}
				/>,
			);

			expect(await screen.findAllByText("約 300ml")).toHaveLength(2);

			await user.click(screen.getByRole("button", { name: "有無だけにする" }));

			expect(await screen.findByText("あり")).toBeInTheDocument();
			expect(screen.queryByText(/300/u)).toBeNull();
			expect(changeTrackingMode).toHaveBeenCalledWith({
				inventoryItemId: oilId,
				trackingMode: "presence",
			});
		});
	});

	describe("削除と呼び名の変更", () => {
		const chickenId = "6b1d4f0e-0a0e-4c85-9a3f-222222222222";

		function chicken(overrides: Partial<InventoryListItem> = {}) {
			return buildInventoryListItem({
				inventoryItemId: chickenId,
				name: "鶏もも肉",
				quantity: 300,
				stockUnitCode: "g",
				stockUnitLabel: "g",
				...overrides,
			});
		}

		it("削除は、確認のあとで行い、一覧から消える。やめれば消えない", async () => {
			const user = userEvent.setup();
			const deleteInventoryItem = vi.fn().mockResolvedValue(true);

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () => createNetworkResult([chicken()])}
					deleteInventoryItem={deleteInventoryItem}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "鶏もも肉を在庫から削除" }),
			);

			expect(deleteInventoryItem).not.toHaveBeenCalled();
			expect(screen.getByText(/ロットと履歴も消えます/u)).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "やめる" }));
			expect(screen.queryByText(/ロットと履歴も消えます/u)).toBeNull();

			await user.click(
				screen.getByRole("button", { name: "鶏もも肉を在庫から削除" }),
			);
			await user.click(screen.getByRole("button", { name: "削除する" }));

			await waitFor(() =>
				expect(screen.queryByText("鶏もも肉")).not.toBeInTheDocument(),
			);
			expect(deleteInventoryItem).toHaveBeenCalledWith(chickenId);
		});

		it("削除に失敗したら、エラーを出し、一覧に残す", async () => {
			const user = userEvent.setup();

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () => createNetworkResult([chicken()])}
					deleteInventoryItem={vi.fn().mockRejectedValue(new Error("offline"))}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "鶏もも肉を在庫から削除" }),
			);
			await user.click(screen.getByRole("button", { name: "削除する" }));

			expect(await screen.findByRole("alert")).toHaveTextContent("offline");
			expect(screen.getByText("鶏もも肉")).toBeInTheDocument();
		});

		it("呼び名を付けると、一覧には呼び名が出て、元の食材の名前も添える。空にすると元に戻る", async () => {
			const user = userEvent.setup();
			const renameInventoryItem = vi
				.fn()
				.mockImplementation(async (command) => command);

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () => createNetworkResult([chicken()])}
					renameInventoryItem={renameInventoryItem}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "鶏もも肉の名前を変更" }),
			);
			await user.type(
				screen.getByLabelText("鶏もも肉の呼び名"),
				"イオンで買った鶏もも",
			);
			await user.click(screen.getByRole("button", { name: "この名前にする" }));

			expect(
				await screen.findByText(/イオンで買った鶏もも/u),
			).toBeInTheDocument();
			expect(screen.getByText("（鶏もも肉）")).toBeInTheDocument();
			expect(renameInventoryItem).toHaveBeenLastCalledWith({
				inventoryItemId: chickenId,
				displayName: "イオンで買った鶏もも",
			});

			await user.click(
				screen.getByRole("button", {
					name: "イオンで買った鶏ももの名前を変更",
				}),
			);
			await user.clear(screen.getByLabelText("鶏もも肉の呼び名"));
			await user.click(screen.getByRole("button", { name: "元の名前に戻す" }));

			await waitFor(() =>
				expect(screen.queryByText("（鶏もも肉）")).not.toBeInTheDocument(),
			);
			expect(renameInventoryItem).toHaveBeenLastCalledWith({
				inventoryItemId: chickenId,
				displayName: null,
			});
			expect(screen.getByText("鶏もも肉")).toBeInTheDocument();
		});
	});

	describe("単位を変える", () => {
		const chickenId = "6b1d4f0e-0a0e-4c85-9a3f-333333333333";

		function chicken() {
			return buildInventoryListItem({
				inventoryItemId: chickenId,
				name: "鶏もも肉",
				quantity: 900,
				stockUnitCode: "g",
				stockUnitLabel: "g",
				lots: [
					createLot({ id: "early", quantity: 300, expiresOn: "2026-10-10" }),
					createLot({ id: "late", quantity: 600, expiresOn: "2026-10-20" }),
				],
			});
		}

		it("候補から単位を選ぶと、ロットごとに換算した量が入り、ロットごとに直して保存できる", async () => {
			const user = userEvent.setup();
			const changeStockUnit = vi.fn().mockResolvedValue({
				inventoryItemId: chickenId,
				stockUnitCode: "count",
				stockUnitLabel: "枚",
				quantity: 3,
				lots: [
					createLot({ id: "early", quantity: 1, expiresOn: "2026-10-10" }),
					createLot({ id: "late", quantity: 2, expiresOn: "2026-10-20" }),
				],
			});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () => createNetworkResult([chicken()])}
					changeStockUnit={changeStockUnit}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "鶏もも肉の単位を変える" }),
			);
			await user.selectOptions(
				screen.getByLabelText("鶏もも肉の新しい単位"),
				"count:枚",
			);

			// 300g → 1.2枚、600g → 2.4枚 が、ロットごとの目安として入る
			const [early, late] = screen.getAllByLabelText(
				"10/1に追加のロットの新しい単位での量",
			);

			if (!early || !late) {
				throw new Error("ロットの欄が見つかりません");
			}

			expect(early).toHaveValue("1.2");
			expect(late).toHaveValue("2.4");

			// 早い方のロットだけ直す
			await user.clear(early);
			await user.type(early, "1");
			await user.click(screen.getByRole("button", { name: "この単位にする" }));

			expect(await screen.findAllByText("3枚")).not.toHaveLength(0);
			expect(changeStockUnit).toHaveBeenCalledWith({
				inventoryItemId: chickenId,
				stockUnitCode: "count",
				stockUnitLabel: "枚",
				lotQuantities: [
					{ lotId: "early", quantity: 1 },
					{ lotId: "late", quantity: 2.4 },
				],
			});
		});

		it("現在の単位は候補に出ない。有無だけの食材には、ボタンを出さない", async () => {
			const user = userEvent.setup();

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([
							chicken(),
							buildInventoryListItem({
								inventoryItemId: "oil",
								name: "オリーブオイル",
								trackingMode: "presence",
								quantity: 1,
							}),
						])
					}
					changeStockUnit={vi.fn()}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "鶏もも肉の単位を変える" }),
			);

			const options = screen
				.getAllByRole("option")
				.map((option) => option.textContent);

			expect(options).toContain("枚");
			expect(options).not.toContain("g");
			expect(
				screen.queryByRole("button", { name: "オリーブオイルの単位を変える" }),
			).toBeNull();
		});

		it("換算できない単位では、目安が空になり、変更に失敗したら、エラーを出して元の単位のまま", async () => {
			const user = userEvent.setup();
			const changeStockUnit = vi
				.fn()
				.mockRejectedValue(
					new Error("この単位には換算できないため、いまの量を入力してください"),
				);

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([
							buildInventoryListItem({
								inventoryItemId: chickenId,
								name: "謎の食材",
								quantity: 900,
								stockUnitCode: "g",
								stockUnitLabel: "g",
								lots: [createLot({ id: "only", quantity: 900 })],
							}),
						])
					}
					changeStockUnit={changeStockUnit}
				/>,
			);

			await user.click(
				await screen.findByRole("button", { name: "謎の食材の単位を変える" }),
			);
			// カタログにない食材は、重さと個数の換算の手がかりがないので、目安は空になる
			await user.selectOptions(
				screen.getByLabelText("謎の食材の新しい単位"),
				"count:個",
			);
			expect(
				screen.getByLabelText("10/1に追加のロットの新しい単位での量"),
			).toHaveValue("");

			await user.click(screen.getByRole("button", { name: "この単位にする" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"いまの量を入力",
			);
			expect(screen.getByText("謎の食材")).toBeInTheDocument();
		});
	});

	describe("ロットごとの数量を直す", () => {
		it("ロットの数量を直接直せる。有無だけの食材には、出さない", async () => {
			const user = userEvent.setup();
			const setLotQuantity = vi.fn().mockResolvedValue({
				inventoryItemId: "milk",
				quantity: 300,
				lots: [createLot({ id: "lot-1", quantity: 300 })],
			});

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([
							buildInventoryListItem({
								inventoryItemId: "milk",
								name: "牛乳",
								quantity: 500,
								stockUnitCode: "ml",
								stockUnitLabel: "ml",
								lots: [createLot({ id: "lot-1", quantity: 500 })],
							}),
							buildInventoryListItem({
								inventoryItemId: "oil",
								name: "オリーブオイル",
								quantity: 1,
								trackingMode: "presence",
								lots: [createLot({ id: "lot-2", quantity: 1 })],
							}),
						])
					}
					setLotQuantity={setLotQuantity}
				/>,
			);

			// 牛乳のロットだけに、「数量」が出る
			const buttons = await screen.findAllByRole("button", {
				name: "10/1に追加のロットの数量を直す",
			});

			expect(buttons).toHaveLength(1);

			await user.click(buttons[0] as HTMLElement);
			await user.clear(screen.getByLabelText("10/1に追加のロットの数量"));
			await user.type(screen.getByLabelText("10/1に追加のロットの数量"), "300");
			await user.click(screen.getByRole("button", { name: "この数量にする" }));

			expect(setLotQuantity).toHaveBeenCalledWith({
				lotId: "lot-1",
				quantity: 300,
			});
			expect(await screen.findAllByText("300ml")).not.toHaveLength(0);
		});

		it("数量が読めないときは送らず、失敗したときはエラーを出す", async () => {
			const user = userEvent.setup();
			const setLotQuantity = vi.fn().mockRejectedValue(new Error("failed"));

			render(
				<InventoryList
					ownerScope="user:user-id"
					loadInventoryItems={async () =>
						createNetworkResult([
							buildInventoryListItem({
								inventoryItemId: "milk",
								name: "牛乳",
								quantity: 500,
								stockUnitCode: "ml",
								stockUnitLabel: "ml",
								lots: [createLot({ id: "lot-1", quantity: 500 })],
							}),
						])
					}
					setLotQuantity={setLotQuantity}
				/>,
			);

			await user.click(
				await screen.findByRole("button", {
					name: "10/1に追加のロットの数量を直す",
				}),
			);
			await user.clear(screen.getByLabelText("10/1に追加のロットの数量"));
			await user.type(screen.getByLabelText("10/1に追加のロットの数量"), "abc");
			await user.click(screen.getByRole("button", { name: "この数量にする" }));

			expect(await screen.findByRole("alert")).toHaveTextContent("数量を確認");
			expect(setLotQuantity).not.toHaveBeenCalled();

			await user.clear(screen.getByLabelText("10/1に追加のロットの数量"));
			await user.type(screen.getByLabelText("10/1に追加のロットの数量"), "100");
			await user.click(screen.getByRole("button", { name: "この数量にする" }));

			expect(await screen.findByRole("alert")).toHaveTextContent("failed");
			expect(screen.getAllByText("500ml")).not.toHaveLength(0);
		});
	});
});
