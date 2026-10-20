import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingStore } from "../domain/shopping-store";
import { ShoppingList } from "./shopping-list";

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
		const repository = createFakeShoppingRepository();

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
			expect(repository.items).toContainEqual(
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
			screen.queryByRole("button", { name: "卵を並べ替え" }),
		).not.toBeInTheDocument();
	});

	it("まとめて追加：読み取った内容を確認してから、見出しの店・@店名・数量つきで（単位のない数字は、食材の一般的な単位で）一覧に追加する", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();
		const store = createShoppingStore("イオン", 0);

		await getLocalDatabase().shoppingStores.add(store);
		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "まとめて追加" }));

		const memo = await screen.findByRole("textbox", {
			name: "買うもの（1行に1つ）",
		});

		await user.click(memo);
		await user.paste("イオン\n卵 10個\n牛乳 2\n\nパン @ドンキ");

		// 確認の一覧（狭い画面は、「確認」のタブ）：店と、登録のない店の注意。
		await user.click(screen.getByRole("button", { name: /^確認/ }));

		const preview = screen.getByRole("list", { name: "読み取った内容" });

		expect(within(preview).getByText("2本")).toBeInTheDocument();
		expect(within(preview).getAllByText("イオン")).toHaveLength(2);
		expect(
			within(preview).getByText("「ドンキ」は、登録のない店です"),
		).toBeInTheDocument();
		expect(repository.items).toHaveLength(0);

		await user.click(screen.getByRole("button", { name: "3件を追加" }));

		await waitFor(() => expect(repository.items).toHaveLength(3));
		expect(repository.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "卵",
					quantity: 10,
					unitLabel: "個",
					storeId: store.id,
				}),
				expect.objectContaining({
					name: "牛乳",
					quantity: 2,
					unitLabel: "本",
					storeId: store.id,
				}),
				expect.objectContaining({ name: "パン", storeId: null }),
				// カタログにある食材は、追加した時点で、カテゴリが自動で決まる。
				expect.objectContaining({
					name: "卵",
					categoryId: expect.any(String),
					categoryAssignment: "automatic",
				}),
			]),
		);
	});

	it("まとめて追加：書きかけの食材名・店の名前を補完できる（クリックと、↓と Tab）", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		await getLocalDatabase().shoppingStores.add(
			createShoppingStore("イオン", 0),
		);
		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "まとめて追加" }));

		const memo = await screen.findByRole("textbox", {
			name: "買うもの（1行に1つ）",
		});

		// クリック：書きかけの行だけを置き換える。
		await user.type(memo, "卵 2{Enter}たまね");
		await user.click(await screen.findByRole("button", { name: "玉ねぎ" }));
		expect(memo).toHaveProperty("value", "卵 2\n玉ねぎ");

		// 数量を書き始めたら、候補は出ない。
		await user.type(memo, " 3");
		expect(screen.queryByRole("list", { name: "補完の候補" })).toBeNull();

		// @ のあと：店の名前。Tab で決める。
		await user.type(memo, "{Enter}牛乳 @");
		await user.keyboard("{ArrowDown}{Tab}");
		expect(memo).toHaveProperty("value", "卵 2\n玉ねぎ 3\n牛乳 @イオン");
	});

	it("まとめて追加：登録のない店を、その場で店に追加でき、追加すると、その店の項目になる", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "まとめて追加" }));
		await user.click(
			await screen.findByRole("textbox", { name: "買うもの（1行に1つ）" }),
		);
		await user.paste("ひき肉@ドンキ\n豚肉@ドンキ");

		// 同じ名前の店は、1つのボタンにまとまる。
		await user.click(
			screen.getByRole("button", { name: "「ドンキ」を店に追加" }),
		);

		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "「ドンキ」を店に追加" }),
			).toBeNull(),
		);
		await expect(getLocalDatabase().shoppingStores.count()).resolves.toBe(1);

		await user.click(screen.getByRole("button", { name: "2件を追加" }));

		await waitFor(() => expect(repository.items).toHaveLength(2));
		expect(repository.items.every((item) => item.storeId !== null)).toBe(true);
	});

	it("店の管理から、店を追加できる（店が1つもなくても）", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(<ShoppingList repository={repository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "店ごと" }));

		const input = screen.getByLabelText("新しい店の名前");

		// 名前が空のうちは追加できない。
		expect(screen.getByRole("button", { name: "店を追加" })).toBeDisabled();

		await user.type(input, "スーパーB{Enter}");

		await waitFor(() =>
			expect(screen.getByText("スーパーB")).toBeInTheDocument(),
		);
		expect(input).toHaveProperty("value", "");
		await expect(getLocalDatabase().shoppingStores.count()).resolves.toBe(1);
	});

	it("店ごとの表示でも、同じ店の項目は、一覧の並び順のまま。分類をまたいだ並び順も保つ", async () => {
		const user = userEvent.setup();
		const store = createShoppingStore("スーパーA", 0);

		await getLocalDatabase().shoppingStores.add(store);
		// 配列の順番は、並び順（sortOrder）と、わざと違える。
		const repository = createFakeShoppingRepository([
			buildShoppingItem({
				id: "c",
				name: "牛乳",
				categoryId: "dairy",
				storeId: store.id,
				sortOrder: 2,
			}),
			buildShoppingItem({
				id: "a",
				name: "豚肉",
				categoryId: "meat",
				storeId: store.id,
				sortOrder: 0,
			}),
			buildShoppingItem({
				id: "b",
				name: "玉ねぎ",
				categoryId: "produce",
				storeId: store.id,
				sortOrder: 1,
			}),
		]);

		render(<ShoppingList repository={repository} />);

		await user.click(await screen.findByRole("button", { name: "店ごと" }));

		const section = screen
			.getByRole("heading", { name: "スーパーA" })
			.closest("section") as HTMLElement;
		const names = within(section)
			.getAllByRole("checkbox")
			.map((checkbox) => checkbox.getAttribute("aria-label"));

		expect(names).toEqual([
			"豚肉をチェック",
			"玉ねぎをチェック",
			"牛乳をチェック",
		]);
	});
});
