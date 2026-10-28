import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingBranch } from "../domain/shopping-branch";
import { createShoppingItem } from "../domain/shopping-item";
import { createShoppingStore } from "../domain/shopping-store";
import { dexieShoppingBranchRepository } from "../infrastructure/dexie-shopping-branch-repository";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import { ShoppingList } from "./shopping-list";

beforeEach(async () => {
	const database = getLocalDatabase();

	await database.shoppingItems.clear();
	await database.shoppingBranches.clear();
	await database.shoppingStores.clear();
	await database.shoppingStoreDefaults.clear();
});

afterEach(() => {
	localStorage.clear();
});

// カードの「その他」メニューから、項目を選ぶ。
async function chooseFromMenu(
	user: ReturnType<typeof userEvent.setup>,
	scope: HTMLElement,
	triggerName: RegExp | string,
	itemName: string,
) {
	await user.click(within(scope).getByRole("button", { name: triggerName }));
	await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

describe("ShoppingList の条件つきのメモ", () => {
	it("条件つきのメモに入れた項目は一覧に出ず、チェックもできず、決めると選んだ側だけが一覧に出る", async () => {
		const user = userEvent.setup();

		render(<ShoppingList repository={dexieShoppingRepository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(
			screen.getByRole("button", { name: "条件つきのメモを追加" }),
		);

		// 条件になる材料を、通常のメモと同じ欄に入れ、「どんな時に」は初期値（売っていたら）のままにする。
		const creation = screen.getByRole("dialog", {
			name: "条件つきのメモを追加",
		});

		expect(within(creation).getByLabelText(/どんな時に/)).toHaveValue(
			"売っていたら",
		);

		await user.type(within(creation).getByLabelText("買うもの"), "合い挽き");
		await user.click(
			within(creation).getByRole("button", { name: "条件つきのメモを作る" }),
		);

		const card = (
			await screen.findByRole("heading", { name: /合い挽きが売っていたら/ })
		).closest("section") as HTMLElement;

		// ふだんはたたんである。中身を開いて、タブで側を切り替えながら入れる。
		await user.click(within(card).getByRole("button", { name: /中身を見る/ }));

		// 「そうなら」の側に玉ねぎ、「そうでなければ」の側に鶏ももを入れる。
		for (const [title, name] of [
			["そうなら", "玉ねぎ"],
			["そうでなければ", "鶏もも"],
		] as const) {
			await user.click(
				within(card).getByRole("button", {
					name: new RegExp(`^${title} \\d+$`),
				}),
			);
			await chooseFromMenu(user, card, `${title}に追加`, "1つ追加");

			const sheet = await screen.findByRole("dialog", {
				name: `${title}に追加`,
			});

			const input = within(sheet).getByLabelText("買うもの");
			// 1 文字ずつの打鍵は、CI の遅い環境で、途中の文字が欠けることがあった（「鶏もも」が「鶏」になった）。
			// このテストの目的は条件つきのメモの動作なので、1 回の入力（貼り付け）で入れる。
			await user.click(input);
			await user.paste(name);
			await waitFor(() => expect(input).toHaveValue(name), { timeout: 5000 });
			await user.click(
				within(sheet).getByRole("button", { name: "この側に追加" }),
			);
			// 追加しても閉じない（続けて入れられる）。次の側のために、完了で閉じる。
			await user.click(within(sheet).getByRole("button", { name: "完了" }));
			// 閉じ終わる前に、次の側のボタンを押さない（閉じる途中は、背面の操作が効かないことがある）。
			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: `${title}に追加` }),
				).not.toBeInTheDocument(),
			);
		}

		// 全体のテストを並行して動かすと、描画が遅れることがあるので、待ちを長めにする。
		// 側ごとに、タブで切り替えて見る（「そうでなければ」を見ているあいだは、玉ねぎは出ない）。
		await waitFor(
			() => expect(within(card).getByText(/鶏もも/)).toBeInTheDocument(),
			{ timeout: 5000 },
		);
		expect(within(card).queryByText(/玉ねぎ/)).not.toBeInTheDocument();

		await user.click(
			within(card).getByRole("button", { name: /^そうなら \d+$/ }),
		);

		expect(await within(card).findByText(/玉ねぎ/)).toBeInTheDocument();

		// 通常の一覧には出ず、チェックの欄もない。
		expect(
			screen.queryByRole("checkbox", { name: "玉ねぎをチェック" }),
		).not.toBeInTheDocument();
		// 条件の材料も、買うもの（チェックできない）として分岐の中にある。
		expect(
			screen.queryByRole("checkbox", { name: "合い挽きをチェック" }),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "そうだった" }));

		expect(
			await screen.findByRole("checkbox", { name: "玉ねぎをチェック" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "合い挽きをチェック" }),
		).toBeInTheDocument();
		expect(screen.queryByText(/鶏もも/)).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /が売っていたら/ }),
		).not.toBeInTheDocument();

		await expect(getLocalDatabase().shoppingBranches.count()).resolves.toBe(0);
		await expect(getLocalDatabase().shoppingItems.count()).resolves.toBe(2);
	});

	it("条件つきのメモの削除は、確認のあとに行い、やめれば残る", async () => {
		const user = userEvent.setup();
		const branch = createShoppingBranch({ condition: "売っていたら" }, 0);

		await dexieShoppingBranchRepository.create(
			branch,
			createShoppingItem({
				name: "合い挽き",
				branchId: branch.id,
				branchSide: "condition",
			}),
		);

		render(<ShoppingList repository={dexieShoppingRepository} />);

		const card = (
			await screen.findByRole("heading", { name: /合い挽き.*が売っていたら/ })
		).closest("section") as HTMLElement;

		await chooseFromMenu(user, card, /のその他/, "削除する");

		const dialog = screen.getByRole("alertdialog", {
			name: "条件つきのメモを削除",
		});

		await user.click(within(dialog).getByRole("button", { name: "やめる" }));

		expect(
			screen.getByRole("heading", { name: /合い挽き.*が売っていたら/ }),
		).toBeInTheDocument();

		await chooseFromMenu(user, card, /のその他/, "削除する");
		await user.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "削除する",
			}),
		);

		await waitFor(() =>
			expect(
				screen.queryByRole("heading", { name: /が売っていたら/ }),
			).not.toBeInTheDocument(),
		);
	});

	// 条件つきのメモと、条件の材料（店つき）を、保存しておく。
	async function seedBranch(storeId: string | null, name = "合い挽き") {
		const now = new Date("2026-10-12T00:00:00.000Z");
		const branch = createShoppingBranch(
			{ condition: "売っていたら" },
			0,
			now,
			"branch-1",
		);

		await dexieShoppingBranchRepository.create(
			branch,
			createShoppingItem(
				{ name, storeId, branchId: branch.id, branchSide: "condition" },
				now,
				0,
			),
		);
	}

	it("条件の材料と、どんな時に・呼び名を、あとから直せる", async () => {
		const user = userEvent.setup();

		await seedBranch(null);
		render(<ShoppingList repository={dexieShoppingRepository} />);

		const card = (
			await screen.findByRole("heading", { name: /合い挽きが売っていたら/ })
		).closest("section") as HTMLElement;

		await chooseFromMenu(user, card, /のその他/, "条件を直す");

		const dialog = await screen.findByRole("dialog", { name: "条件を直す" });

		// 直したい部分を押すと、その入力だけが開く。
		await user.click(
			within(dialog).getByRole("button", { name: "売っていたら" }),
		);

		const condition = within(dialog).getByLabelText("どんな時に");

		await user.clear(condition);
		await user.type(condition, "安ければ");
		await user.type(within(dialog).getByLabelText("そうなら"), "ハンバーグ");
		await user.click(within(dialog).getByRole("button", { name: "合い挽き" }));

		const name = within(dialog).getByLabelText("材料");

		await user.clear(name);
		await user.type(name, "牛ひき");
		await user.click(within(dialog).getByRole("button", { name: "保存" }));

		expect(
			await screen.findByRole("heading", { name: /牛ひきが安ければ/ }),
		).toBeInTheDocument();
		expect(screen.getByText("ハンバーグ 0件")).toBeInTheDocument();
		await expect(
			getLocalDatabase().shoppingBranches.get("branch-1"),
		).resolves.toMatchObject({
			condition: "安ければ",
			thenLabel: "ハンバーグ",
		});
	});

	it("条件を空にして保存はできない", async () => {
		const user = userEvent.setup();

		await seedBranch(null);
		render(<ShoppingList repository={dexieShoppingRepository} />);

		const card = (
			await screen.findByRole("heading", { name: /合い挽きが売っていたら/ })
		).closest("section") as HTMLElement;

		await chooseFromMenu(user, card, /のその他/, "条件を直す");

		const dialog = await screen.findByRole("dialog", { name: "条件を直す" });

		await user.click(
			within(dialog).getByRole("button", { name: "売っていたら" }),
		);
		await user.clear(within(dialog).getByLabelText("どんな時に"));

		expect(within(dialog).getByRole("button", { name: "保存" })).toBeDisabled();

		// 保存されず、元の条件のまま。
		await expect(
			getLocalDatabase().shoppingBranches.get("branch-1"),
		).resolves.toMatchObject({ condition: "売っていたら" });
	});

	it("各側に、「まとめて追加」で、続けて入れられる（店の見出し・数量も読む）", async () => {
		const user = userEvent.setup();

		await seedBranch(null);
		render(<ShoppingList repository={dexieShoppingRepository} />);

		const card = (
			await screen.findByRole("heading", { name: /合い挽きが売っていたら/ })
		).closest("section") as HTMLElement;

		await user.click(within(card).getByRole("button", { name: /中身を見る/ }));
		await chooseFromMenu(user, card, "そうならに追加", "まとめて追加");

		const sheet = await screen.findByRole("dialog", {
			name: "そうならにまとめて追加",
		});

		await user.click(within(sheet).getByRole("textbox"));
		await user.paste("玉ねぎ 2\nにんじん");
		await user.click(within(sheet).getByRole("button", { name: "2件を追加" }));

		await waitFor(async () => {
			const items = await getLocalDatabase().shoppingItems.toArray();

			expect(
				items
					.filter((item) => item.branchSide === "then")
					.map((item) => [item.name, item.quantity, item.branchId]),
			).toEqual(
				expect.arrayContaining([
					["玉ねぎ", 2, "branch-1"],
					["にんじん", 1, "branch-1"],
				]),
			);
		});
		// 通常の一覧には出ない。
		expect(
			screen.queryByRole("checkbox", { name: "玉ねぎをチェック" }),
		).not.toBeInTheDocument();
	});

	it("店ごとの表示では、条件つきのメモも、条件の材料の店に入り、今いる店で絞れる", async () => {
		const user = userEvent.setup();
		const storeA = createShoppingStore("スーパーA", 0);
		const storeB = createShoppingStore("スーパーB", 1);

		await getLocalDatabase().shoppingStores.bulkAdd([storeA, storeB]);
		await seedBranch(storeB.id);
		await dexieShoppingRepository.save(
			createShoppingItem({ name: "牛乳", storeId: storeA.id }, new Date(), 5),
		);
		render(<ShoppingList repository={dexieShoppingRepository} />);

		await user.click(await screen.findByRole("button", { name: "店ごと" }));

		const sectionB = screen
			.getByRole("heading", { name: "スーパーB" })
			.closest("section") as HTMLElement;

		expect(
			within(sectionB).getByRole("heading", {
				name: /スーパーBに合い挽きが売っていたら/,
			}),
		).toBeInTheDocument();

		// 今いる店を A にすると、B の条件つきのメモは出ない。
		await user.selectOptions(screen.getByLabelText("今いる店"), "スーパーA");

		expect(
			screen.queryByRole("heading", { name: /合い挽きが売っていたら/ }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "スーパーA" }),
		).toBeInTheDocument();
	});
});
