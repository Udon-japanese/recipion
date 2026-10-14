import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	addDays,
	toDateString,
} from "#/features/inventory/domain/inventory-lot";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import type { ShoppingItem } from "../domain/shopping-item";
import { ShoppingList } from "./shopping-list";

const storedItem: ShoppingItem = buildShoppingItem({
	quantity: 6,
	unitLabel: "個",
	categoryAssignment: "manual",
});

afterEach(() => {
	// 期限の目安の設定・覚えた期限が、テストの間で残らないようにする。
	localStorage.clear();
});

describe("ShoppingList", () => {
	it("保存済みの買い物項目を表示する", async () => {
		const repository = createFakeShoppingRepository([storedItem]);

		render(<ShoppingList repository={repository} />);

		expect(
			await screen.findByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeInTheDocument();

		expect(screen.getByText("6個")).toBeInTheDocument();
	});

	it("端数の数量は分数で表し、換算後の重さは丸める（大根 1/3本（333g））", async () => {
		const repository = createFakeShoppingRepository([
			buildShoppingItem({
				id: "daikon",
				name: "大根",
				quantity: 0.333333,
				unitLabel: "本",
				categoryAssignment: "manual",
				inventoryConversion: {
					inputUnitCode: "count",
					stockUnitCode: "g",
					stockUnitLabel: "g",
					stockQuantityPerInputUnit: 1000,
					trackingMode: "estimated",
				},
			}),
		]);

		render(<ShoppingList repository={repository} />);

		expect(await screen.findByText("1/3本")).toBeInTheDocument();
		expect(screen.getByText("（333g）")).toBeInTheDocument();
	});

	it("数量のボタンは、入力した単位に合わせて変わる（本は 1/3、g は +50）", async () => {
		const user = userEvent.setup();

		render(<ShoppingList repository={createFakeShoppingRepository()} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByLabelText("買うもの"));
		await user.type(screen.getByLabelText("単位"), "本");
		await user.click(screen.getByRole("button", { name: "1/3にする" }));

		expect(screen.getByLabelText("数量")).toHaveValue("1/3");
		expect(screen.queryByRole("button", { name: "50を足す" })).toBeNull();

		await user.clear(screen.getByLabelText("単位"));
		await user.type(screen.getByLabelText("単位"), "g");
		await user.clear(screen.getByLabelText("数量"));
		await user.click(screen.getByRole("button", { name: "50を足す" }));
		await user.click(screen.getByRole("button", { name: "100を足す" }));

		expect(screen.getByLabelText("数量")).toHaveValue("150");
		expect(screen.queryByRole("button", { name: "1/3にする" })).toBeNull();
	});

	it("名前が空のまま追加を押すと、入力を促して、何も追加しない", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "追加" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"買うものを入力してください",
		);
		expect(repository.items).toHaveLength(0);

		await user.type(screen.getByLabelText("買うもの"), "卵");

		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("買い物項目を追加する", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "卵");
		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "6");
		await user.type(screen.getByLabelText("単位"), "個");
		await user.click(screen.getByRole("button", { name: "追加" }));

		await waitFor(() => {
			expect(repository.items).toContainEqual(
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
		expect(screen.getByLabelText("数量")).toHaveValue("1");
		expect(screen.getByLabelText("単位")).toHaveValue("");
		expect(screen.getByLabelText("カテゴリ")).toHaveValue("");
	});

	it("買い物項目のチェック状態を切り替える", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository([storedItem]);

		render(<ShoppingList repository={repository} />);

		const checkbox = await screen.findByRole("checkbox", {
			name: "卵をチェック",
		});

		await user.click(checkbox);

		await waitFor(() => {
			expect(repository.items).toContainEqual(
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
		const repository = createFakeShoppingRepository([storedItem]);

		render(<ShoppingList repository={repository} />);

		await user.click(await screen.findByRole("button", { name: "卵のその他" }));
		await user.click(screen.getByRole("menuitem", { name: "削除" }));

		await waitFor(() => {
			expect(repository.items).toEqual([]);
		});

		expect(
			screen.queryByRole("checkbox", {
				name: "卵をチェック",
			}),
		).not.toBeInTheDocument();
	});

	it("読み込みに失敗した場合はエラーを表示する", async () => {
		const repository = createFakeShoppingRepository();

		repository.failNext("list");

		render(<ShoppingList repository={repository} />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"買い物メモを読み込めませんでした",
		);
	});

	it("0以下の数量を追加しない", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "牛乳");
		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "0");
		await user.click(screen.getByRole("button", { name: "追加" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"数量は0より大きい数にしてください",
		);
		expect(repository.items).toEqual([]);
	});

	it("商品名に応じた数量プリセットを選択できる", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "卵");

		const sixEggsButton = screen.getByRole("button", {
			name: "6個",
		});

		expect(sixEggsButton).toHaveAttribute("aria-pressed", "false");

		await user.click(sixEggsButton);

		expect(screen.getByLabelText("数量")).toHaveValue("6");
		expect(screen.getByLabelText("単位")).toHaveValue("個");
		expect(sixEggsButton).toHaveAttribute("aria-pressed", "true");

		await user.click(
			screen.getByRole("button", {
				name: "追加",
			}),
		);

		await waitFor(() => {
			expect(repository.items).toContainEqual(
				expect.objectContaining({
					name: "卵",
					quantity: 6,
					unitLabel: "個",
					inventoryConversion: {
						inputUnitCode: "count",
						stockUnitCode: "count",
						stockUnitLabel: "個",
						stockQuantityPerInputUnit: 1,
						trackingMode: "exact",
					},
				}),
			);
		});
	});

	it("商品の購入単位と在庫換算後の数量を表示する", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");

		await user.type(screen.getByLabelText("買うもの"), "ホケミ");

		await user.click(
			screen.getByRole("button", {
				name: "200g袋",
			}),
		);

		await user.click(
			screen.getByRole("button", {
				name: "追加",
			}),
		);

		expect(
			await screen.findByRole("checkbox", {
				name: "ホケミをチェック",
			}),
		).toBeInTheDocument();

		expect(screen.getByText("1袋")).toBeInTheDocument();
		expect(screen.getByText("（200g）")).toBeInTheDocument();
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

		const repository = createFakeShoppingRepository([
			{
				...storedItem,
				sortOrder: 0,
			},
			secondItem,
		]);

		render(<ShoppingList repository={repository} />);

		async function openMenu(name: string) {
			await user.click(
				await screen.findByRole("button", { name: `${name}のその他` }),
			);

			return {
				up: screen.getByRole("menuitem", { name: "上へ" }),
				down: screen.getByRole("menuitem", { name: "下へ" }),
			};
		}

		// 先頭の「上へ」と、末尾の「下へ」は選べない。
		const eggMenu = await openMenu("卵");

		expect(eggMenu.up).toHaveAttribute("aria-disabled", "true");

		await user.keyboard("{Escape}");

		const milkMenu = await openMenu("牛乳");

		expect(milkMenu.down).toHaveAttribute("aria-disabled", "true");

		await user.keyboard("{Escape}");

		await user.click((await openMenu("卵")).down);

		await waitFor(() => {
			expect(repository.items).toEqual([
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
		const repository = createFakeShoppingRepository();

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
			expect(repository.items).toContainEqual(
				expect.objectContaining({
					name: "タマゴ",
					categoryId: "eggs",
				}),
			);
		});
	});

	it("手動で選択したカテゴリを商品名で上書きしない", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");

		await user.click(screen.getByLabelText("買うもの"));
		await user.selectOptions(screen.getByLabelText("カテゴリ"), "pantry");
		await user.type(screen.getByLabelText("買うもの"), "卵");

		expect(screen.getByLabelText("カテゴリ")).toHaveValue("pantry");
	});

	it("買い物項目を標準的な売り場順に並べる", async () => {
		const user = userEvent.setup();
		const eggItem: ShoppingItem = {
			...storedItem,
			categoryId: "eggs",
			sortOrder: 0,
		};
		const produceItem: ShoppingItem = {
			...storedItem,
			id: "item-2",
			name: "玉ねぎ",
			categoryId: "produce",
			sortOrder: 1,
		};

		const repository = createFakeShoppingRepository([eggItem, produceItem]);

		render(<ShoppingList repository={repository} />);

		await user.click(await screen.findByRole("button", { name: "並べ替え" }));
		await user.click(screen.getByRole("menuitem", { name: "売り場順" }));

		await waitFor(() => {
			expect(repository.items).toEqual([
				expect.objectContaining({
					id: produceItem.id,
					sortOrder: 0,
				}),
				expect.objectContaining({
					id: eggItem.id,
					sortOrder: 1,
				}),
			]);
		});

		expect(
			screen
				.getAllByRole("checkbox")
				.map((checkbox) => checkbox.getAttribute("aria-label")),
		).toEqual(["玉ねぎをチェック", "卵をチェック"]);
	});

	it("買い物項目を売り場の逆回り順に並べる", async () => {
		const user = userEvent.setup();
		const produceItem: ShoppingItem = {
			...storedItem,
			id: "produce",
			name: "玉ねぎ",
			categoryId: "produce",
			sortOrder: 0,
		};
		const eggItem: ShoppingItem = {
			...storedItem,
			id: "eggs",
			name: "卵",
			categoryId: "eggs",
			sortOrder: 1,
		};

		const repository = createFakeShoppingRepository([produceItem, eggItem]);

		render(<ShoppingList repository={repository} />);

		await user.click(await screen.findByRole("button", { name: "並べ替え" }));
		await user.click(screen.getByRole("menuitem", { name: "逆回り" }));

		await waitFor(() => {
			expect(repository.items).toEqual([
				expect.objectContaining({
					id: eggItem.id,
					sortOrder: 0,
				}),
				expect.objectContaining({
					id: produceItem.id,
					sortOrder: 1,
				}),
			]);
		});

		expect(
			screen
				.getAllByRole("checkbox")
				.map((checkbox) => checkbox.getAttribute("aria-label")),
		).toEqual(["卵をチェック", "玉ねぎをチェック"]);
	});

	it("未判定の既存項目を読み込み時に分類して保存する", async () => {
		const repository = createFakeShoppingRepository([
			{
				...storedItem,
				name: "卵",
				categoryId: null,
				categoryAssignment: null,
			},
		]);

		render(<ShoppingList repository={repository} />);

		expect(
			await screen.findByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeInTheDocument();

		await waitFor(() => {
			expect(repository.items).toEqual([
				expect.objectContaining({
					categoryId: "eggs",
					categoryAssignment: "automatic",
				}),
			]);
		});
	});

	it("手動で未設定にしたカテゴリを自動分類しない", async () => {
		const repository = createFakeShoppingRepository([
			{
				...storedItem,
				name: "卵",
				categoryId: null,
				categoryAssignment: "manual",
			},
		]);

		render(<ShoppingList repository={repository} />);

		expect(
			await screen.findByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeInTheDocument();

		expect(repository.items[0]).toMatchObject({
			categoryId: null,
			categoryAssignment: "manual",
		});
	});

	it("買い物項目にドラッグ用ハンドルを表示する", async () => {
		const repository = createFakeShoppingRepository([
			{
				...storedItem,
				categoryAssignment: "manual",
			},
		]);

		render(<ShoppingList repository={repository} />);

		expect(
			await screen.findByRole("button", {
				name: "卵を並べ替え",
			}),
		).toBeInTheDocument();
	});

	it("ホケミの包装量を買い物項目へ保存する", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.type(screen.getByLabelText("買うもの"), "HM");
		await user.click(
			screen.getByRole("button", {
				name: "200g袋",
			}),
		);
		await user.click(
			screen.getByRole("button", {
				name: "追加",
			}),
		);

		await waitFor(() => {
			expect(repository.items).toContainEqual(
				expect.objectContaining({
					name: "HM",
					quantity: 1,
					unitLabel: "袋",
					inventoryConversion: expect.objectContaining({
						stockUnitCode: "g",
						stockQuantityPerInputUnit: 200,
						trackingMode: "estimated",
					}),
				}),
			);
		});
	});

	it("チェック済み商品を購入確定する", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "count",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "exact",
			},
		};

		const purchasedItem: ShoppingItem = {
			...checkedItem,
			status: "purchased",
		};

		const repository = createFakeShoppingRepository([checkedItem]);

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [purchasedItem],
		});

		render(
			<ShoppingList
				repository={repository}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		// 期限の確認画面（入力は任意）で、そのまま確定する。
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		expect(confirmPurchases).toHaveBeenCalledWith("guest", {
			lotsByItemId: {},
		});

		expect(
			screen.getByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeChecked();

		expect(
			screen.getByRole("checkbox", {
				name: "卵をチェック",
			}),
		).toBeDisabled();

		expect(screen.getByText("購入済み")).toBeInTheDocument();
	});

	it("在庫換算がない商品は購入確定せず案内する", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "謎の商品",
			status: "checked",
			inventoryConversion: null,
		};

		const repository = createFakeShoppingRepository([checkedItem]);

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "missing-conversion",
			items: [checkedItem],
		});

		render(
			<ShoppingList
				repository={repository}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		// 期限の確認画面（入力は任意）で、そのまま確定する。
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"謎の商品の在庫換算を設定してください",
		);
		expect(
			screen.getByRole("checkbox", {
				name: "謎の商品をチェック",
			}),
		).not.toBeDisabled();
	});

	it("ログイン済みなら購入確定後に在庫同期を試す", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "count",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "exact",
			},
		};

		const purchasedItem: ShoppingItem = {
			...checkedItem,
			status: "purchased",
		};

		const repository = createFakeShoppingRepository([checkedItem]);

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [purchasedItem],
		});

		const syncPurchases = vi.fn().mockResolvedValue({
			syncedCount: 1,
			failedEntryId: null,
		});

		render(
			<ShoppingList
				repository={repository}
				ownerScope="user:user-id"
				confirmPurchases={confirmPurchases}
				syncPurchases={syncPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		// 期限の確認画面（入力は任意）で、そのまま確定する。
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		await waitFor(() => {
			expect(confirmPurchases).toHaveBeenCalledWith("user:user-id", {
				lotsByItemId: {},
			});
			expect(syncPurchases).toHaveBeenCalledWith("user:user-id");
		});
	});

	it("購入確定の前に期限を入力すると、購入の記録に期限・保存方法を載せる", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "鶏もも肉",
			quantity: 1,
			unitLabel: "パック",
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "pack",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 300,
				trackingMode: "estimated",
			},
		};

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [{ ...checkedItem, status: "purchased" }],
		});

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		// 期限の確認画面：明日の期限、消費期限、冷蔵
		await user.click(
			await screen.findByRole("button", { name: "期限を明日にする" }),
		);
		await user.selectOptions(screen.getByLabelText("期限の種類"), "use-by");
		await user.selectOptions(screen.getByLabelText("保存方法"), "fridge");
		await user.click(screen.getByRole("button", { name: "購入確定" }));

		await waitFor(() =>
			expect(confirmPurchases).toHaveBeenCalledWith("guest", {
				lotsByItemId: {
					[checkedItem.id]: {
						expiresOn: addDays(toDateString(new Date()), 1),
						expirySource: "entered",
						expiryKind: "use-by",
						storage: "fridge",
					},
				},
			}),
		);
	});

	it("目安を付けられる食材は、期限の確認画面に、約の日付が入っていて、目安として記録する", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "冷凍ブロッコリー",
			quantity: 1,
			unitLabel: "袋",
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "bag",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 500,
				trackingMode: "estimated",
			},
		};

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [{ ...checkedItem, status: "purchased" }],
		});

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		// 冷凍野菜：購入から90日（短め）
		const today = toDateString(new Date());

		expect(await screen.findByLabelText("期限")).toHaveValue(
			addDays(today, 90),
		);
		expect(screen.getByText(/目安の日付（約）です/u)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "購入確定" }));

		await waitFor(() =>
			expect(confirmPurchases).toHaveBeenCalledWith("guest", {
				lotsByItemId: {
					[checkedItem.id]: {
						expiresOn: addDays(today, 90),
						expirySource: "estimated",
						expiryKind: "best-before",
					},
				},
			}),
		);
	});

	it("期限の確認画面で、目安をオフにすると、日付が消え、そのまま確定すると、期限なしで記録する", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "冷凍ブロッコリー",
			quantity: 1,
			unitLabel: "袋",
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "bag",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 500,
				trackingMode: "estimated",
			},
		};

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [{ ...checkedItem, status: "purchased" }],
		});

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);
		await user.selectOptions(
			await screen.findByLabelText("期限の目安の自動入力"),
			"off",
		);

		expect(screen.getByLabelText("期限")).toHaveValue("");

		await user.click(screen.getByRole("button", { name: "購入確定" }));

		await waitFor(() =>
			expect(confirmPurchases).toHaveBeenCalledWith("guest", {
				lotsByItemId: {},
			}),
		);
	});

	it("在庫に入る商品がなければ（日用品だけ）、期限の確認なしで購入確定する", async () => {
		const user = userEvent.setup();

		const household: ShoppingItem = {
			...storedItem,
			name: "トイレットペーパー",
			quantity: 1,
			unitLabel: null,
			categoryId: "household",
			status: "checked",
			inventoryConversion: null,
		};

		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [{ ...household, status: "purchased" }],
		});

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([household])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));
		expect(
			screen.queryByRole("region", { name: "購入する食材の期限" }),
		).toBeNull();
	});

	it("期限の確認画面で、キャンセルすると、購入確定しない", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "count",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "exact",
			},
		};
		const confirmPurchases = vi.fn();

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);
		await user.click(await screen.findByRole("button", { name: "キャンセル" }));

		expect(confirmPurchases).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("region", { name: "購入する食材の期限" }),
		).toBeNull();
	});

	it("購入確定時に不足している在庫換算を設定できる", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "たまご",
			quantity: 1,
			unitLabel: null,
			status: "checked",
			inventoryConversion: null,
		};

		const configuredItem: ShoppingItem = {
			...checkedItem,
			quantity: 6,
			unitLabel: "個",
			inventoryConversion: {
				inputUnitCode: "count",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "exact",
			},
		};

		const purchasedItem: ShoppingItem = {
			...configuredItem,
			status: "purchased",
		};

		const repository = createFakeShoppingRepository([checkedItem]);

		const confirmPurchases = vi
			.fn()
			.mockResolvedValueOnce({
				status: "missing-conversion",
				items: [checkedItem],
			})
			.mockResolvedValueOnce({
				status: "confirmed",
				items: [purchasedItem],
			});

		render(
			<ShoppingList
				repository={repository}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "購入を確定（1件）",
			}),
		);

		// 期限の確認画面（入力は任意）で、そのまま確定する。
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		expect(
			await screen.findByRole("heading", {
				name: "たまごを在庫へ追加する方法",
			}),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", {
				name: "6個",
			}),
		);

		await waitFor(() => {
			expect(repository.items).toContainEqual(
				expect.objectContaining({
					id: checkedItem.id,
					quantity: 6,
					unitLabel: "個",
					inventoryConversion: configuredItem.inventoryConversion,
				}),
			);

			expect(confirmPurchases).toHaveBeenCalledTimes(2);
		});

		expect(await screen.findByText("購入済み")).toBeInTheDocument();
	});
});
