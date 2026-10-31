import { render, screen, waitFor, within } from "@testing-library/react";
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
		expect(screen.getByText("333g")).toBeInTheDocument();
	});

	it("数量のボタンは、入力した単位に合わせて変わる（本は 1/3、g は +50）", async () => {
		const user = userEvent.setup();

		render(<ShoppingList repository={createFakeShoppingRepository()} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
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

	it("チェックしたものがないときは、「購入を確定」を出さない。チェックすると、出る", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository([storedItem]);

		render(<ShoppingList repository={repository} />);

		await screen.findByRole("checkbox", {
			name: `${storedItem.name}をチェック`,
		});

		expect(screen.queryByRole("button", { name: /購入を確定/ })).toBeNull();

		await user.click(
			screen.getByRole("checkbox", { name: `${storedItem.name}をチェック` }),
		);

		expect(
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		).toBeInTheDocument();
	});

	it("名前が空のまま追加を押すと、入力を促して、何も追加しない", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		// 追加ボタンは、入力欄に触れて、フォームが開いてから、右下に出る。
		expect(screen.queryByRole("button", { name: "追加" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
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
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
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
		expect(screen.getByText("未設定")).toBeInTheDocument();
		// 入れたものが、シートに残る（続けて入れている手応え）。
		expect(screen.getByText(/卵 6個/)).toBeInTheDocument();
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
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
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
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
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

		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
		await user.type(screen.getByLabelText("買うもの"), "ホケミ");

		await user.click(
			screen.getByRole("button", {
				name: "200g袋 ×3",
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

		expect(screen.getByText("3袋")).toBeInTheDocument();
		expect(screen.getByText("600g")).toBeInTheDocument();
	});

	it("「編集」で、追加と同じシートが開き、直して保存すると、一覧に反映されて閉じる", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository([
			buildShoppingItem({ name: "卵", quantity: 1, unitLabel: "パック" }),
		]);

		render(<ShoppingList repository={repository} />);

		await user.click(await screen.findByRole("button", { name: "卵のその他" }));
		await user.click(screen.getByRole("menuitem", { name: "編集" }));

		const sheet = await screen.findByRole("dialog", { name: "卵を直す" });

		expect(within(sheet).getByLabelText("商品名")).toHaveValue("卵");

		await user.clear(within(sheet).getByLabelText("数量"));
		await user.type(within(sheet).getByLabelText("数量"), "2");
		await user.click(within(sheet).getByRole("button", { name: "保存" }));

		await waitFor(() => {
			expect(repository.items).toEqual([
				expect.objectContaining({
					name: "卵",
					quantity: 2,
					unitLabel: "パック",
				}),
			]);
		});
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "卵を直す" }),
			).not.toBeInTheDocument();
		});
		expect(screen.getByText("2パック")).toBeInTheDocument();
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
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
		await user.type(screen.getByLabelText("買うもの"), "タマゴ");

		// 名前から、カテゴリが自動で決まる。
		expect(screen.getByText("自動")).toBeInTheDocument();

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

		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
		await user.click(screen.getByRole("button", { name: "選ぶ" }));
		await user.selectOptions(screen.getByLabelText("カテゴリ"), "pantry");
		await user.type(screen.getByLabelText("買うもの"), "卵");

		expect(screen.getByLabelText("カテゴリ")).toHaveValue("pantry");
		expect(screen.queryByText("自動")).toBeNull();
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
		await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
		await user.type(screen.getByLabelText("買うもの"), "HM");
		await user.click(
			screen.getByRole("button", {
				name: "200g袋 ×3",
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
					quantity: 3,
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
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		expect(confirmPurchases).toHaveBeenCalledWith("guest", {
			lotsByItemId: {},
		});

		// 購入済みは、閉じたセクションにまとまる。開くと、そこにある。
		expect(screen.queryByRole("checkbox", { name: "卵をチェック" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "購入済み1" }));

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
	});

	describe("購入済みのまとめ", () => {
		const purchased = (name: string): ShoppingItem => ({
			...storedItem,
			id: `purchased-${name}`,
			name,
			status: "purchased",
		});

		it("閉じたままでも、一括で削除できる（確認あり）", async () => {
			const user = userEvent.setup();
			const repository = createFakeShoppingRepository([
				purchased("卵"),
				purchased("牛乳"),
			]);

			render(<ShoppingList repository={repository} />);

			await user.click(
				await screen.findByRole("button", { name: "購入済み2件をすべて削除" }),
			);
			await user.click(screen.getByRole("button", { name: "すべて削除する" }));

			await waitFor(() => expect(repository.items).toHaveLength(0));
			expect(screen.queryByRole("button", { name: "購入済み2" })).toBeNull();
		});

		it("開くと、1つずつ削除できる", async () => {
			const user = userEvent.setup();
			const repository = createFakeShoppingRepository([
				purchased("卵"),
				purchased("牛乳"),
			]);

			render(<ShoppingList repository={repository} />);

			await user.click(
				await screen.findByRole("button", { name: "購入済み2" }),
			);
			await user.click(screen.getByRole("button", { name: "卵のその他" }));
			await user.click(screen.getByRole("menuitem", { name: "削除" }));

			await waitFor(() =>
				expect(repository.items.map((item) => item.name)).toEqual(["牛乳"]),
			);
		});
	});

	it("在庫換算がない商品があれば、購入確定の前に、在庫に入れる量を聞く", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "謎の商品",
			status: "checked",
			inventoryConversion: null,
		};
		const confirmPurchases = vi.fn();

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);

		expect(
			await screen.findByRole("heading", {
				name: "在庫に入れる量を教えてください",
			}),
		).toBeInTheDocument();
		expect(confirmPurchases).not.toHaveBeenCalled();
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
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		await waitFor(() => {
			expect(confirmPurchases).toHaveBeenCalledWith("user:user-id", {
				lotsByItemId: {},
			});
			expect(syncPurchases).toHaveBeenCalledWith("user:user-id");
		});
	});

	it("目安を付けられる食材は、確認のあとで購入確定し、期限を目安として記録する", async () => {
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
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		// 冷凍野菜：購入から90日（短め）
		const today = toDateString(new Date());

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

	it("換算が足りない商品は、確認の画面で、換算を入れて、まとめて購入確定する", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "はなげ",
			quantity: 1,
			unitLabel: "袋",
			status: "checked",
			inventoryConversion: null,
		};

		const repository = createFakeShoppingRepository([checkedItem]);
		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [{ ...checkedItem, status: "purchased" }],
		});

		render(
			<ShoppingList
				repository={repository}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);

		const quantity = await screen.findByLabelText("はなげの1袋あたりの数");

		await user.clear(quantity);
		await user.type(quantity, "300");
		await user.selectOptions(
			screen.getByLabelText("はなげの在庫で使う単位"),
			"g",
		);
		await user.click(screen.getByRole("button", { name: "購入確定" }));

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));
		expect(repository.items[0]?.inventoryConversion).toMatchObject({
			stockQuantityPerInputUnit: 300,
		});
		// 換算のためだけの別のシートは、開かない。
		expect(
			screen.queryByRole("heading", { name: /を在庫へ追加する方法/u }),
		).toBeNull();
	});

	it("換算の数量が読めないときは、購入確定せず、その行に理由を出す", async () => {
		const user = userEvent.setup();

		const checkedItem: ShoppingItem = {
			...storedItem,
			name: "はなげ",
			quantity: 1,
			unitLabel: "袋",
			status: "checked",
			inventoryConversion: null,
		};
		const confirmPurchases = vi.fn();

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);
		await user.clear(await screen.findByLabelText("はなげの1袋あたりの数"));
		await user.click(screen.getByRole("button", { name: "購入確定" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"0より大きい数",
		);
		expect(confirmPurchases).not.toHaveBeenCalled();
	});

	it("換算がそろっていても、確認を押すまでは、購入確定しない。「やめる」でも、確定しない", async () => {
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
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);

		expect(
			await screen.findByRole("alertdialog", { name: "購入を確定しますか" }),
		).toBeInTheDocument();
		expect(confirmPurchases).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "やめる" }));

		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(confirmPurchases).not.toHaveBeenCalled();
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

	it("購入確定時に不足している在庫換算を、候補から選んで設定できる", async () => {
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

		const repository = createFakeShoppingRepository([checkedItem]);
		const confirmPurchases = vi.fn().mockResolvedValue({
			status: "confirmed",
			items: [{ ...configuredItem, status: "purchased" }],
		});

		render(
			<ShoppingList
				repository={repository}
				confirmPurchases={confirmPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);
		await user.click(await screen.findByRole("button", { name: "6個" }));
		await user.click(screen.getByRole("button", { name: "購入確定" }));

		await waitFor(() => {
			expect(repository.items).toContainEqual(
				expect.objectContaining({
					id: checkedItem.id,
					quantity: 6,
					unitLabel: "個",
					inventoryConversion: configuredItem.inventoryConversion,
				}),
			);

			expect(confirmPurchases).toHaveBeenCalledTimes(1);
		});

		expect(await screen.findByText("購入済み")).toBeInTheDocument();
	});
});
