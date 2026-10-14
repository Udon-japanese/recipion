import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingBranch } from "../domain/shopping-branch";
import { createShoppingItem } from "../domain/shopping-item";
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
			await screen.findByRole("heading", { name: /合い挽き 1.*が売っていたら/ })
		).closest("div") as HTMLElement;

		// 「そうなら」の側に玉ねぎ、「そうでなければ」の側に鶏ももを入れる。
		for (const [title, name] of [
			["そうなら", "玉ねぎ"],
			["そうでなければ", "鶏もも"],
		] as const) {
			await user.click(
				within(card).getByRole("button", { name: `${title}に追加` }),
			);

			const sheet = await screen.findByRole("dialog", {
				name: `${title}に追加`,
			});

			await user.type(within(sheet).getByLabelText("買うもの"), name);
			await user.click(
				within(sheet).getByRole("button", { name: "この側に追加" }),
			);
			// 追加しても閉じない（続けて入れられる）。次の側のために、完了で閉じる。
			await user.click(within(sheet).getByRole("button", { name: "完了" }));
		}

		await waitFor(() => {
			expect(within(card).getByText(/玉ねぎ/)).toBeInTheDocument();
			expect(within(card).getByText(/鶏もも/)).toBeInTheDocument();
		});

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

		await user.click(
			await screen.findByRole("button", {
				name: "合い挽きの条件つきのメモを削除",
			}),
		);

		const dialog = screen.getByRole("alertdialog", {
			name: "条件つきのメモを削除",
		});

		await user.click(within(dialog).getByRole("button", { name: "やめる" }));

		expect(
			screen.getByRole("heading", { name: /合い挽き.*が売っていたら/ }),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "合い挽きの条件つきのメモを削除" }),
		);
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
});
