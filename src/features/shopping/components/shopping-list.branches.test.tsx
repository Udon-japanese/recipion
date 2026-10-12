import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
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

describe("ShoppingList の条件つきのメモ", () => {
	it("条件つきのメモに入れた項目は一覧に出ず、チェックもできず、決めると選んだ側だけが一覧に出る", async () => {
		const user = userEvent.setup();

		render(<ShoppingList repository={dexieShoppingRepository} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(
			screen.getByRole("button", { name: "＋ 条件つきのメモを追加" }),
		);

		// 条件になる材料を、通常のメモと同じ欄に入れ、「どんな時に」は初期値（売っていたら）のままにする。
		const creation = screen
			.getByText("条件になる材料を入れて、どんな時かを書きます。")
			.closest("div") as HTMLElement;

		expect(within(creation).getByLabelText(/どんな時に/)).toHaveValue(
			"売っていたら",
		);

		await user.type(within(creation).getByLabelText("買うもの"), "合い挽き");
		await user.click(
			within(creation).getByRole("button", { name: "条件つきのメモを作る" }),
		);

		const card = (
			await screen.findByRole("heading", { name: /合い挽き 1.*が売っていたら/ })
		).closest("div") as HTMLElement;

		// 「そうなら」の側に玉ねぎ、「そうでなければ」の側に鶏ももを入れる。
		const [thenDetails, elseDetails] = Array.from(
			card.querySelectorAll("details"),
		) as HTMLElement[];

		for (const [details, name] of [
			[thenDetails, "玉ねぎ"],
			[elseDetails, "鶏もも"],
		] as const) {
			await user.click(
				within(details).getByText(/に追加$/, { selector: "summary" }),
			);
			await user.type(within(details).getByLabelText("買うもの"), name);
			await user.click(
				within(details).getByRole("button", { name: "この側に追加" }),
			);
		}

		await waitFor(() => {
			expect(within(card).getByText(/玉ねぎ/)).toBeInTheDocument();
			expect(within(card).getByText(/鶏もも/)).toBeInTheDocument();
		});

		// 通常の一覧には出ず、チェックの欄もない。
		expect(
			screen.queryByRole("checkbox", { name: "玉ねぎをチェック" }),
		).not.toBeInTheDocument();
		expect(screen.getByText("買うものはまだありません。")).toBeInTheDocument();

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
});
