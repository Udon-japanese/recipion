import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetStorageItemsForTest } from "#/local-storage/storage-item";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { typeDate } from "#/test/date-field-helpers";
import {
	chooseExpiryKind,
	chooseExpiryStorage,
} from "#/test/expiry-fields-helpers";
import type { InventoryListItem } from "../application/inventory-query-repository";
import {
	addDays,
	type InventoryLot,
	toDateString,
} from "../domain/inventory-lot";
import {
	inventoryGroupByStorage,
	inventoryPetStorage,
	inventoryViewStorage,
} from "../infrastructure/inventory-view-storage";
import { InventoryList } from "./inventory-list";

beforeEach(() => {
	localStorage.clear();
	resetStorageItemsForTest();
});

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

type ListProps = Partial<ComponentProps<typeof InventoryList>>;

function renderList(items: InventoryListItem[], props: ListProps = {}) {
	return render(
		<InventoryList
			ownerScope="user:user-id"
			loadInventoryItems={async () => createNetworkResult(items)}
			{...props}
		/>,
	);
}

// 冷蔵庫のタイルを押して、食材のパネルを開く。
async function openPanel(
	user: ReturnType<typeof userEvent.setup>,
	name: string,
) {
	await user.click(
		await screen.findByRole("button", { name: new RegExp(`^${name}、`, "u") }),
	);

	return screen.findByRole("dialog");
}

// パネルの見出しの「…」から、めったに使わない操作を選ぶ。
async function chooseFromMenu(
	user: ReturnType<typeof userEvent.setup>,
	dialog: HTMLElement,
	itemName: string,
	label: string,
) {
	await user.click(
		within(dialog).getByRole("button", { name: `${itemName}のその他` }),
	);
	await user.click(await screen.findByRole("menuitem", { name: label }));
}

// 数量に合う1つのロットを持つ食材（在庫の数量は、ロットの合計で決まる）。
function stocked(overrides: Partial<InventoryListItem> = {}) {
	const quantity = overrides.quantity ?? 6;

	return buildInventoryListItem({
		quantity,
		lots: [
			createLot({ id: `lot-${overrides.inventoryItemId ?? "x"}`, quantity }),
		],
		...overrides,
	});
}

const lotA = "6b1d4f0e-0a0e-4c85-9a3f-111111111111";
const lotB = "6b1d4f0e-0a0e-4c85-9a3f-222222222222";

const eggItem = buildInventoryListItem({
	inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
	name: "卵",
	quantity: 5,
	lots: [
		createLot({ id: lotA, quantity: 2, acquiredOn: "2026-10-01" }),
		createLot({ id: lotB, quantity: 3, acquiredOn: "2026-10-03" }),
	],
});

describe("InventoryList", () => {
	it("ログインユーザーの在庫を、行にして表示し、場所の見出しに件数を出す", async () => {
		renderList([
			stocked({ name: "卵", quantity: 6 }),
			stocked({
				inventoryItemId: "milk",
				name: "牛乳",
				quantity: 800,
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				trackingMode: "estimated",
			}),
			buildInventoryListItem({
				inventoryItemId: "shoyu",
				name: "醤油",
				quantity: 1,
				trackingMode: "presence",
				lots: [createLot({ id: "s1", quantity: 1 })],
			}),
		]);

		expect(
			await screen.findByRole("button", { name: "卵、6個、冷蔵室" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "牛乳、約 800ミリリットル、冷蔵室" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "醤油、あり、ドア" }),
		).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "在庫" })).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /^冷蔵室\s*2$/u }),
		).toBeInTheDocument();
	});

	it("表示を「おうち」に切り替えられ、選んだ表示を覚える", async () => {
		const user = userEvent.setup();

		renderList([stocked({ name: "卵", quantity: 6 })]);

		await screen.findByRole("button", { name: /^卵、/u });
		await user.click(screen.getByRole("button", { name: "おうちで見る" }));

		expect(
			screen.getByRole("region", { name: "れしぽよのおうち" }),
		).toBeInTheDocument();
		expect(inventoryViewStorage.read()).toBe("scene");

		await user.click(screen.getByRole("button", { name: "リストで見る" }));

		expect(
			await screen.findByRole("button", { name: /^卵、/u }),
		).toBeInTheDocument();
	});

	it("表示を切り替えると、開いている食材のパネルを閉じる", async () => {
		const user = userEvent.setup();

		renderList([stocked({ name: "卵", quantity: 6 })]);

		await openPanel(user, "卵");
		await user.click(screen.getByRole("button", { name: "おうちで見る" }));

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	describe("読み込み中は、保存した表示に合わせる", () => {
		const pending = () => new Promise<never>(() => {});

		it.each([
			{ saved: "list", scene: false },
			{ saved: "scene", scene: true },
		] as const)(
			"表示が $saved のとき、おうちの絵: $scene",
			({ saved, scene }) => {
				inventoryViewStorage.write(saved);
				renderList([], { loadInventoryItems: pending });

				// 最初の描画から、保存した表示で出す（リストの骨組みを挟まない）。
				expect(
					screen.queryByRole("region", { name: "れしぽよのおうち" }) !== null,
				).toBe(scene);
				expect(screen.getByRole("status")).toHaveTextContent(
					"在庫を読み込んでいます",
				);
				expect(
					screen.getByRole("button", { name: "リストで見る" }),
				).toBeInTheDocument();
				expect(
					screen.getByRole("heading", { name: "在庫" }),
				).toBeInTheDocument();
			},
		);

		it("おうちでは、れしぽよが知らせ、隠していれば、お知らせを出す", () => {
			inventoryViewStorage.write("scene");
			const { unmount } = renderList([], { loadInventoryItems: pending });

			expect(
				screen.getByRole("button", { name: "れしぽよをつつく" }),
			).toHaveAccessibleDescription("よみこみ中…");
			expect(screen.getAllByRole("status")).toHaveLength(1);
			unmount();

			inventoryPetStorage.write(false);
			renderList([], { loadInventoryItems: pending });

			expect(
				screen.queryByRole("button", { name: "れしぽよをつつく" }),
			).not.toBeInTheDocument();
			expect(screen.getAllByRole("status")).toHaveLength(2);
		});
	});

	it("まとめ方の見出しで区切る。まとめ方を選び直すと、見出しが変わり、選んだものを覚える", async () => {
		const user = userEvent.setup();

		renderList([
			stocked({ name: "卵", quantity: 6 }),
			buildInventoryListItem({
				inventoryItemId: "shoyu",
				name: "醤油",
				quantity: 1,
				trackingMode: "presence",
				lots: [createLot({ id: "s1", quantity: 1 })],
			}),
		]);

		await screen.findByRole("button", { name: /^卵、/u });

		expect(
			screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
		).toEqual(["冷蔵室1", "ドア1"]);

		await user.selectOptions(screen.getByLabelText("まとめ方"), "kana");

		expect(
			screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
		).toEqual(["さ1", "た1"]);
		expect(inventoryGroupByStorage.read()).toBe("kana");
	});

	it("期限が近いものを「早めに使う」に出し、押すとパネルが開く。期限でまとめているときは出さない", async () => {
		const user = userEvent.setup();
		const today = toDateString(new Date());
		const soon = (id: string, name: string, days: number) =>
			buildInventoryListItem({
				inventoryItemId: id,
				name,
				lots: [
					createLot({
						id: `lot-${id}`,
						quantity: 1,
						storage: "fridge",
						expiresOn: addDays(today, days),
						expiryKind: "use-by",
					}),
				],
			});

		renderList([
			soon("a", "牛乳", 2),
			soon("b", "卵", 0),
			soon("c", "豆腐", -1),
			soon("d", "納豆", 1),
		]);

		const section = await screen.findByRole("region", { name: "早めに使う" });

		// 近い順に3件だけ。
		expect(
			within(section)
				.getAllByRole("button")
				.map((button) => button.getAttribute("aria-label")),
		).toEqual(["豆腐（期限切れ）", "卵（今日まで）", "納豆（明日まで）"]);

		await user.click(
			within(section).getByRole("button", { name: "卵（今日まで）" }),
		);

		expect(await screen.findByRole("dialog")).toBeInTheDocument();

		await user.selectOptions(screen.getByLabelText("まとめ方"), "expiry");

		expect(
			screen.queryByRole("region", { name: "早めに使う" }),
		).not.toBeInTheDocument();
	});

	it("検索で、名前に合う食材だけにする", async () => {
		const user = userEvent.setup();

		renderList([
			stocked({ name: "卵", quantity: 6 }),
			stocked({ inventoryItemId: "milk", name: "牛乳", quantity: 2 }),
		]);

		await screen.findByRole("button", { name: /^卵、/u });
		await user.type(
			screen.getByRole("searchbox", { name: "在庫を探す" }),
			"牛",
		);

		expect(screen.queryByRole("button", { name: /^卵、/u })).toBeNull();
		expect(
			screen.getByRole("button", { name: /^牛乳、/u }),
		).toBeInTheDocument();
	});

	it("保存方法で、ゾーンが分かれる（冷凍→冷凍室、常温→机の上、野菜→野菜室）", async () => {
		renderList([
			buildInventoryListItem({
				inventoryItemId: "ice",
				name: "冷凍ご飯",
				lots: [createLot({ id: "i", quantity: 6, storage: "freezer" })],
			}),
			buildInventoryListItem({
				inventoryItemId: "salt",
				name: "薄力粉",
				lots: [createLot({ id: "p", quantity: 6, storage: "room" })],
			}),
			buildInventoryListItem({
				inventoryItemId: "carrot",
				name: "にんじん",
				lots: [createLot({ id: "c", quantity: 6, storage: "fridge" })],
			}),
		]);

		expect(
			await screen.findByRole("button", { name: /^冷凍ご飯、.*冷凍室/u }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^薄力粉、.*机の上/u }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^にんじん、.*野菜室/u }),
		).toBeInTheDocument();
	});

	it("期限が近いタイルには、札と読み上げの期限が付く", async () => {
		const tomorrow = addDays(toDateString(new Date()), 1);

		renderList([
			buildInventoryListItem({
				lots: [
					createLot({
						id: "e",
						quantity: 6,
						storage: "fridge",
						expiresOn: tomorrow,
						expiryKind: "use-by",
					}),
				],
			}),
		]);

		const tile = await screen.findByRole("button", { name: /^卵、/u });

		expect(tile).toHaveAccessibleName(/消費期限 \d+月\d+日、あと1日/u);
		expect(within(tile).getByText("明日")).toBeInTheDocument();
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
		renderList([]);

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

		await user.click(screen.getByRole("button", { name: "更新" }));

		await waitFor(() => expect(loadInventoryItems).toHaveBeenCalledTimes(2));
		expect(
			await screen.findByText("在庫はまだありません。"),
		).toBeInTheDocument();
	});

	it("「更新」を押したときだけ、更新したことを、お知らせで伝える", async () => {
		const user = userEvent.setup();

		renderList([]);

		expect(await screen.findByText("在庫はまだありません。")).toBeVisible();
		expect(screen.queryByText("在庫を更新しました")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "更新" }));

		expect(await screen.findByText("在庫を更新しました")).toBeVisible();
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

		await waitFor(() => expect(loadInventoryItems).toHaveBeenCalledTimes(1));

		rerender(
			<InventoryList
				ownerScope="user:user-id"
				loadInventoryItems={loadInventoryItems}
				refreshKey={1}
			/>,
		);

		await waitFor(() => expect(loadInventoryItems).toHaveBeenCalledTimes(2));
	});

	it("タイルを押すとパネルが開き、閉じるとタイルにフォーカスが戻る", async () => {
		const user = userEvent.setup();

		renderList([stocked()], { adjustInventoryItem: vi.fn() });

		const dialog = await openPanel(user, "卵");

		expect(within(dialog).getAllByText("6個")).not.toHaveLength(0);

		await user.click(within(dialog).getByRole("button", { name: "閉じる" }));

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /^卵、/u })).toHaveFocus(),
		);
	});

	it("在庫数量を手動で増やせる（量を打って「買い足した」を押す。欄は、はじめの値に戻る）", async () => {
		const user = userEvent.setup();
		const adjustInventoryItem = vi.fn().mockResolvedValue({
			status: "applied",
			transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
			quantity: 8,
			lots: [],
		});

		renderList(
			[stocked({ inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06" })],
			{
				adjustInventoryItem,
			},
		);

		const dialog = await openPanel(user, "卵");
		const amount = within(dialog).getByRole("textbox", {
			name: "卵の使った量・買い足した量",
		});

		await user.clear(amount);
		await user.type(amount, "2");
		await user.click(
			within(dialog).getByRole("button", { name: "買い足した" }),
		);

		await waitFor(() =>
			expect(adjustInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
					inputQuantity: 2,
					inputUnitCode: "count",
					stockQuantityPerInputUnit: 1,
					operation: "increase",
					reason: "manual-adjustment",
				}),
			),
		);

		expect(await within(dialog).findByText("8個")).toBeInTheDocument();
		expect(amount).toHaveValue("1");
	});

	it("通信できず保存済みの在庫を見ているときは、案内を出し、書き換える操作は理由を出して実行しない", async () => {
		const user = userEvent.setup();
		const adjustInventoryItem = vi.fn();

		renderList([stocked()], {
			loadInventoryItems: async () => ({
				items: [stocked()],
				source: "cache" as const,
				cachedAt: "2026-09-23T10:00:00.000Z",
			}),
			adjustInventoryItem,
		});

		expect(
			await screen.findByText(
				/通信できないため、保存済みの在庫を表示しています/,
			),
		).toBeInTheDocument();

		const dialog = await openPanel(user, "卵");

		await user.click(
			within(dialog).getByRole("button", { name: "買い足した" }),
		);

		expect(
			(
				await within(dialog).findAllByText(
					/通信できないため、いまは変更できません/u,
				)
			).length,
		).toBeGreaterThan(0);
		expect(adjustInventoryItem).not.toHaveBeenCalled();
	});

	describe("ロット", () => {
		it("ロットごとの追加日と数量を、パネルに表示する。行には回数を出さない", async () => {
			const user = userEvent.setup();

			renderList([eggItem]);

			const dialog = await openPanel(user, "卵");
			const lots = within(
				within(dialog).getByRole("list", { name: "卵の内訳" }),
			);

			expect(lots.getByText("10/1に入れた分")).toBeInTheDocument();
			expect(lots.getByText("2個")).toBeInTheDocument();
			expect(lots.getByText("10/3に入れた分")).toBeInTheDocument();
			expect(lots.getByText("3個")).toBeInTheDocument();
		});

		it("入れた分を指定して減らすと、ロットごとの数量を送り、結果を表示する", async () => {
			const user = userEvent.setup();
			const adjustInventoryItem = vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
				quantity: 3,
				lots: [
					createLot({ id: lotA, quantity: 1, acquiredOn: "2026-10-01" }),
					createLot({ id: lotB, quantity: 2, acquiredOn: "2026-10-03" }),
				],
			});

			renderList([eggItem], { adjustInventoryItem });

			const dialog = await openPanel(user, "卵");

			await user.click(
				within(dialog).getByRole("button", { name: "入れた分ごとに減らす" }),
			);
			await user.type(
				screen.getByLabelText("10/1に入れた分から減らす数量"),
				"1",
			);
			await user.type(
				screen.getByLabelText("10/3に入れた分から減らす数量"),
				"1",
			);
			await user.click(within(dialog).getByRole("button", { name: "使った" }));

			await waitFor(() =>
				expect(adjustInventoryItem).toHaveBeenCalledWith(
					expect.objectContaining({
						operation: "decrease",
						inputQuantity: 2,
						allocations: [
							{ lotId: lotA, quantity: 1 },
							{ lotId: lotB, quantity: 1 },
						],
					}),
				),
			);
			expect(
				await within(await screen.findByRole("dialog")).findByText("3個"),
			).toBeInTheDocument();
		});

		it("ロットが1つだけなら、入れた分ごとに減らす切り替えは出さない", async () => {
			const user = userEvent.setup();

			renderList(
				[{ ...eggItem, quantity: 2, lots: eggItem.lots.slice(0, 1) }],
				{ adjustInventoryItem: vi.fn() },
			);

			const dialog = await openPanel(user, "卵");

			expect(
				within(dialog).queryByRole("button", { name: "入れた分ごとに減らす" }),
			).toBeNull();
		});

		it("期限と保存方法を表示する（目安は「約」付き）。期限の近いロットを先に並べる", async () => {
			const user = userEvent.setup();

			renderList([
				{
					...eggItem,
					lots: [
						createLot({
							id: "late",
							quantity: 3,
							expiresOn: "2026-10-20",
							expiryKind: "best-before",
							expirySource: "entered",
						}),
						createLot({
							id: "early",
							quantity: 2,
							storage: "fridge",
							expiresOn: "2026-10-10",
							expiryKind: "use-by",
							expirySource: "estimated",
						}),
					],
				},
			]);

			const dialog = await openPanel(user, "卵");
			const lots = within(
				within(dialog).getByRole("list", { name: "卵の内訳" }),
			);

			expect(lots.getByText("消費期限 約 10/10")).toBeInTheDocument();
			expect(lots.getByText("冷蔵")).toBeInTheDocument();
			expect(lots.getByText("賞味期限 10/20")).toBeInTheDocument();

			const [first] = lots.getAllByRole("listitem");

			expect(first).toHaveTextContent("消費期限 約 10/10");
		});

		it("内訳の期限を、その場で直すと、入力として保存する。直していない項目は、そのまま", async () => {
			const user = userEvent.setup();
			const updateInventoryLot = vi.fn().mockResolvedValue({
				inventoryItemId: eggItem.inventoryItemId,
				quantity: 5,
				lots: eggItem.lots,
				defaultExpiryKind: null,
				defaultStorage: null,
			});

			renderList([eggItem], { updateInventoryLot });

			const dialog = await openPanel(user, "卵");

			await user.click(
				within(dialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			await typeDate(user, "期限", addDays(toDateString(new Date()), 1));
			await chooseExpiryStorage(user, "冷蔵");
			await user.click(screen.getByRole("button", { name: "保存" }));

			await waitFor(() =>
				expect(updateInventoryLot).toHaveBeenCalledWith({
					lotId: lotA,
					expiresOn: addDays(toDateString(new Date()), 1),
					expirySource: "entered",
					expiryKind: null,
					storage: "fridge",
					saveAsIngredientDefault: false,
				}),
			);
			// 編集の欄は、閉じる。
			await waitFor(() =>
				expect(screen.queryByRole("button", { name: "保存" })).toBeNull(),
			);
		});

		it("何も直さずに「保存」を押すと、送らずに閉じる。「やめる」でも、送らない", async () => {
			const user = userEvent.setup();
			const updateInventoryLot = vi.fn();

			renderList([eggItem], { updateInventoryLot });

			const dialog = await openPanel(user, "卵");

			await user.click(
				within(dialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(updateInventoryLot).not.toHaveBeenCalled();
			expect(screen.queryByRole("button", { name: "保存" })).toBeNull();

			await user.click(
				within(dialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			await typeDate(user, "期限", "2026-12-24");
			await user.click(screen.getByRole("button", { name: "やめる" }));

			expect(updateInventoryLot).not.toHaveBeenCalled();
		});

		it("期限の種類と「この食材の初期値にする」も、その場の欄で直す", async () => {
			const user = userEvent.setup();
			const updateInventoryLot = vi.fn().mockResolvedValue({
				inventoryItemId: eggItem.inventoryItemId,
				quantity: 5,
				lots: eggItem.lots,
				defaultExpiryKind: null,
				defaultStorage: null,
			});

			renderList([eggItem], { updateInventoryLot });

			const dialog = await openPanel(user, "卵");

			await user.click(
				within(dialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			await typeDate(user, "期限", addDays(toDateString(new Date()), 1));
			await chooseExpiryKind(user, "消費期限");
			await user.click(screen.getByLabelText(/この食材の初期値にする/u));
			await user.click(screen.getByRole("button", { name: "保存" }));

			await waitFor(() =>
				expect(updateInventoryLot).toHaveBeenCalledWith({
					lotId: lotA,
					expiresOn: addDays(toDateString(new Date()), 1),
					expirySource: "entered",
					expiryKind: "use-by",
					storage: null,
					saveAsIngredientDefault: true,
				}),
			);
		});

		it("フォームの「戻る」で、パネルの本体に戻る", async () => {
			const user = userEvent.setup();

			renderList([eggItem], {
				adjustInventoryItem: vi.fn(),
				renameInventoryItem: vi.fn(),
			});

			const dialog = await openPanel(user, "卵");

			await chooseFromMenu(user, dialog, "卵", "名前を変更");
			expect(screen.getByLabelText("卵の呼び名")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "戻る" }));

			expect(screen.queryByLabelText("卵の呼び名")).toBeNull();
			expect(
				screen.getByRole("button", { name: "買い足した" }),
			).toBeInTheDocument();
		});
	});

	describe("有無だけで管理している食材", () => {
		const oilId = "6b1d4f0e-0a0e-4c85-9a3f-111111111111";

		function presenceItem(quantity: number, overrides = {}): InventoryListItem {
			return buildInventoryListItem({
				inventoryItemId: oilId,
				name: "オリーブオイル",
				quantity,
				lots: quantity > 0 ? [createLot({ id: "lot-1", quantity })] : [],
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				trackingMode: "presence",
				...overrides,
			});
		}

		it("数量を出さず、「あり」だけを表示し、ロットにも数量を出さない。調整はない", async () => {
			const user = userEvent.setup();

			renderList([presenceItem(1)], { adjustInventoryItem: vi.fn() });

			const dialog = await openPanel(user, "オリーブオイル");

			expect(within(dialog).getByText("あり")).toBeInTheDocument();
			expect(within(dialog).queryByText(/\d+\s*ml/u)).toBeNull();
			expect(within(dialog).queryByRole("button", { name: "調整" })).toBeNull();
		});

		it("「なくなった」で「なし」になり、「ある」で「あり」に戻る（タイルも同じ）", async () => {
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

			renderList([presenceItem(1)], { adjustInventoryItem });

			const dialog = await openPanel(user, "オリーブオイル");

			await user.click(
				within(dialog).getByRole("button", { name: "なくなった" }),
			);

			expect(
				await screen.findByRole("button", {
					name: "オリーブオイル、なし、ドア",
				}),
			).toBeInTheDocument();
			expect(adjustInventoryItem).toHaveBeenLastCalledWith(
				expect.objectContaining({ operation: "decrease" }),
			);

			await user.click(await screen.findByRole("button", { name: "ある" }));

			expect(
				await screen.findByRole("button", {
					name: "オリーブオイル、あり、ドア",
				}),
			).toBeInTheDocument();
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

			renderList([presenceItem(1)], { changeTrackingMode });

			const dialog = await openPanel(user, "オリーブオイル");

			await chooseFromMenu(
				user,
				dialog,
				"オリーブオイル",
				"量を追う管理にする",
			);
			await user.type(
				screen.getByRole("textbox", { name: "オリーブオイルのいまの量" }),
				"300",
			);
			await user.click(
				screen.getByRole("button", { name: "この量で管理する" }),
			);

			expect(
				await within(await screen.findByRole("dialog")).findAllByText(
					"約 300ml",
				),
			).toHaveLength(2);
			expect(changeTrackingMode).toHaveBeenCalledWith({
				inventoryItemId: oilId,
				trackingMode: "estimated",
				currentQuantity: 300,
			});
		});

		it("量を追う食材は、確認のあと「有無だけにする」で、数量を出さなくなる。やめれば変えない", async () => {
			const user = userEvent.setup();
			const changeTrackingMode = vi.fn().mockResolvedValue({
				inventoryItemId: oilId,
				trackingMode: "presence",
				quantity: 1,
				lots: [createLot({ id: "lot-1", quantity: 1 })],
			});

			renderList([presenceItem(300, { trackingMode: "estimated" })], {
				changeTrackingMode,
			});

			const dialog = await openPanel(user, "オリーブオイル");

			await chooseFromMenu(user, dialog, "オリーブオイル", "有無だけにする");
			await user.click(screen.getByRole("button", { name: "やめる" }));
			expect(changeTrackingMode).not.toHaveBeenCalled();

			await chooseFromMenu(user, dialog, "オリーブオイル", "有無だけにする");
			await user.click(screen.getByRole("button", { name: "有無だけにする" }));

			expect(
				await within(await screen.findByRole("dialog")).findByText("あり"),
			).toBeInTheDocument();
			expect(within(screen.getByRole("dialog")).queryByText(/300/u)).toBeNull();
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

			renderList([chicken()], { deleteInventoryItem });

			const dialog = await openPanel(user, "鶏もも肉");

			await chooseFromMenu(user, dialog, "鶏もも肉", "削除");

			expect(deleteInventoryItem).not.toHaveBeenCalled();
			expect(screen.getByText(/内訳と履歴も消えます/u)).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "やめる" }));
			expect(screen.queryByText(/内訳と履歴も消えます/u)).toBeNull();

			await chooseFromMenu(user, dialog, "鶏もも肉", "削除");
			await user.click(screen.getByRole("button", { name: "削除する" }));

			await waitFor(() =>
				expect(
					screen.queryByRole("button", { name: /^鶏もも肉、/u }),
				).not.toBeInTheDocument(),
			);
			expect(deleteInventoryItem).toHaveBeenCalledWith(chickenId);
		});

		it("削除したあと、フォーカスは次のタイルへ移る", async () => {
			const user = userEvent.setup();

			renderList(
				[
					chicken({ name: "鶏もも肉" }),
					chicken({
						inventoryItemId: "6b1d4f0e-0a0e-4c85-9a3f-333333333333",
						name: "鶏むね肉",
					}),
				],
				{ deleteInventoryItem: vi.fn().mockResolvedValue(true) },
			);

			const dialog = await openPanel(user, "鶏もも肉");

			await chooseFromMenu(user, dialog, "鶏もも肉", "削除");
			await user.click(screen.getByRole("button", { name: "削除する" }));

			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: /^鶏むね肉、/u }),
				).toHaveFocus(),
			);
		});

		it("削除に失敗したら、エラーを出し、一覧に残す", async () => {
			const user = userEvent.setup();

			renderList([chicken()], {
				deleteInventoryItem: vi.fn().mockRejectedValue(new Error("offline")),
			});

			const dialog = await openPanel(user, "鶏もも肉");

			await chooseFromMenu(user, dialog, "鶏もも肉", "削除");
			await user.click(screen.getByRole("button", { name: "削除する" }));

			// ネットワークなどの内部の文（英語）は出さず、操作の失敗として知らせる。
			const alert = await screen.findByRole("alert");

			expect(alert).toHaveTextContent("在庫を削除できませんでした");
			expect(alert).not.toHaveTextContent("offline");
			expect(
				screen.getByRole("button", { name: /^鶏もも肉、/u }),
			).toBeInTheDocument();
		});

		it("呼び名を付けると、タイルには呼び名が出て、パネルの見出しに元の名前も添える。空にすると元に戻る", async () => {
			const user = userEvent.setup();
			const renameInventoryItem = vi
				.fn()
				.mockImplementation(async (command) => command);

			renderList([chicken()], { renameInventoryItem });

			const dialog = await openPanel(user, "鶏もも肉");

			await chooseFromMenu(user, dialog, "鶏もも肉", "名前を変更");
			await user.type(
				screen.getByLabelText("鶏もも肉の呼び名"),
				"イオンで買った鶏もも",
			);
			await user.click(screen.getByRole("button", { name: "この名前にする" }));

			expect(
				await screen.findByRole("dialog", {
					name: "イオンで買った鶏もも（鶏もも肉）",
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /^イオンで買った鶏もも、/u }),
			).toBeInTheDocument();
			expect(renameInventoryItem).toHaveBeenLastCalledWith({
				inventoryItemId: chickenId,
				displayName: "イオンで買った鶏もも",
			});

			await chooseFromMenu(
				user,
				screen.getByRole("dialog"),
				"イオンで買った鶏もも",
				"名前を変更",
			);
			await user.clear(screen.getByLabelText("鶏もも肉の呼び名"));
			await user.click(screen.getByRole("button", { name: "元の名前に戻す" }));

			expect(
				await screen.findByRole("dialog", { name: "鶏もも肉" }),
			).toBeInTheDocument();
			expect(renameInventoryItem).toHaveBeenLastCalledWith({
				inventoryItemId: chickenId,
				displayName: null,
			});
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

			renderList([chicken()], { changeStockUnit });

			const dialog = await openPanel(user, "鶏もも肉");

			await chooseFromMenu(user, dialog, "鶏もも肉", "単位を変える");
			await user.selectOptions(
				screen.getByRole("combobox", { name: "鶏もも肉の新しい単位" }),
				"count:枚",
			);

			// 300g → 1.2枚、600g → 2.4枚 が、ロットごとの目安として入る
			const [early, late] = screen.getAllByLabelText(
				"10/1に入れた分の新しい単位での量",
			);

			if (!early || !late) {
				throw new Error("ロットの欄が見つかりません");
			}

			expect(early).toHaveValue("1.2");
			expect(late).toHaveValue("2.4");

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

			renderList(
				[
					chicken(),
					buildInventoryListItem({
						inventoryItemId: "oil",
						name: "オリーブオイル",
						trackingMode: "presence",
						quantity: 1,
					}),
				],
				{ changeStockUnit: vi.fn() },
			);

			const dialog = await openPanel(user, "鶏もも肉");

			await chooseFromMenu(user, dialog, "鶏もも肉", "単位を変える");

			// マスタにある単位だけ：鶏もも肉は g（いまの単位）と枚。ml や個は出ない
			expect(
				within(dialog)
					.getAllByRole("option")
					.map((option) => option.textContent),
			).toEqual(["枚"]);

			await user.click(screen.getByRole("button", { name: "戻る" }));
			await user.click(
				within(screen.getByRole("dialog")).getByRole("button", {
					name: "閉じる",
				}),
			);
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

			const oilDialog = await openPanel(user, "オリーブオイル");

			// 出せる操作がないので、「…」も出さない。
			expect(
				within(oilDialog).queryByRole("button", {
					name: "オリーブオイルのその他",
				}),
			).toBeNull();
		});

		it("換算できない単位では、目安が空になり、変更に失敗したら、エラーを出して元の単位のまま", async () => {
			const user = userEvent.setup();
			const changeStockUnit = vi
				.fn()
				.mockRejectedValue(
					new Error("この単位には換算できないため、いまの量を入力してください"),
				);

			renderList(
				[
					buildInventoryListItem({
						inventoryItemId: chickenId,
						name: "謎の食材",
						quantity: 900,
						stockUnitCode: "g",
						stockUnitLabel: "g",
						lots: [createLot({ id: "only", quantity: 900 })],
					}),
				],
				{ changeStockUnit },
			);

			const dialog = await openPanel(user, "謎の食材");

			await chooseFromMenu(user, dialog, "謎の食材", "単位を変える");
			await user.selectOptions(
				screen.getByRole("combobox", { name: "謎の食材の新しい単位" }),
				"count:個",
			);
			expect(
				screen.getByLabelText("10/1に入れた分の新しい単位での量"),
			).toHaveValue("");

			await user.click(screen.getByRole("button", { name: "この単位にする" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"いまの量を入力",
			);
			expect(
				screen.getByRole("button", { name: /^謎の食材、.*900グラム/u }),
			).toBeInTheDocument();
		});
	});

	describe("ロットごとの数量を直す", () => {
		function milk() {
			return buildInventoryListItem({
				inventoryItemId: "milk",
				name: "牛乳",
				quantity: 500,
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				lots: [createLot({ id: "lot-1", quantity: 500 })],
			});
		}

		it("ロットの数量を直接直せる。有無だけの食材には、出さない", async () => {
			const user = userEvent.setup();
			const setLotQuantity = vi.fn().mockResolvedValue({
				inventoryItemId: "milk",
				quantity: 300,
				lots: [createLot({ id: "lot-1", quantity: 300 })],
			});

			renderList(
				[
					milk(),
					buildInventoryListItem({
						inventoryItemId: "oil",
						name: "オリーブオイル",
						quantity: 1,
						trackingMode: "presence",
						lots: [createLot({ id: "lot-2", quantity: 1 })],
					}),
				],
				{ setLotQuantity },
			);

			const oilDialog = await openPanel(user, "オリーブオイル");

			// 有無だけの食材は、直す欄に、数量がない。
			await user.click(
				within(oilDialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			expect(screen.queryByLabelText("10/1に入れた分の数量")).toBeNull();
			expect(screen.getByLabelText("期限")).toBeInTheDocument();

			await user.click(
				within(oilDialog).getByRole("button", { name: "閉じる" }),
			);
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

			const dialog = await openPanel(user, "牛乳");

			await user.click(
				within(dialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			await user.clear(screen.getByLabelText("10/1に入れた分の数量"));
			await user.type(screen.getByLabelText("10/1に入れた分の数量"), "300");
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(setLotQuantity).toHaveBeenCalledWith({
				lotId: "lot-1",
				quantity: 300,
			});
			expect(await screen.findAllByText("300ml")).not.toHaveLength(0);
		});

		it("数量が読めないときは送らず、失敗したときはエラーを出す", async () => {
			const user = userEvent.setup();
			const setLotQuantity = vi.fn().mockRejectedValue(new Error("failed"));

			renderList([milk()], { setLotQuantity });

			const dialog = await openPanel(user, "牛乳");

			await user.click(
				within(dialog).getByRole("button", { name: "10/1に入れた分を直す" }),
			);
			await user.clear(screen.getByLabelText("10/1に入れた分の数量"));
			await user.type(screen.getByLabelText("10/1に入れた分の数量"), "abc");
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(await screen.findByRole("alert")).toHaveTextContent("数量を確認");
			expect(setLotQuantity).not.toHaveBeenCalled();

			await user.clear(screen.getByLabelText("10/1に入れた分の数量"));
			await user.type(screen.getByLabelText("10/1に入れた分の数量"), "100");
			await user.click(screen.getByRole("button", { name: "保存" }));

			await waitFor(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"数量を直せませんでした",
				),
			);
		});
	});
});
