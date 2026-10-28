import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingBranch } from "../domain/shopping-branch";
import { createShoppingItem } from "../domain/shopping-item";
import { dexieShoppingBranchRepository } from "../infrastructure/dexie-shopping-branch-repository";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import type { RenderRecipePicker } from "./recipe-picker-slot";
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

// レシピの部品の代わり。押すと、入れ先に「カレー」の材料を1つ保存して、入れたことを知らせる。
const renderPicker: RenderRecipePicker = ({
	repository,
	destination,
	onApplied,
	onClose,
}) => (
	<div>
		<button
			type="button"
			onClick={async () => {
				await repository.save(
					createShoppingItem({
						name: "じゃがいも",
						quantity: 2,
						unitLabel: "個",
						...(destination
							? { branchId: destination.branchId, branchSide: destination.side }
							: {}),
					}),
				);
				onApplied("カレー");
			}}
		>
			カレーの材料を入れる
		</button>
		<button type="button" onClick={onClose}>
			ピッカーを閉じる
		</button>
	</div>
);

describe("ShoppingList の「レシピから入れる」", () => {
	it("部品が渡されなければ（ゲスト）、ボタンを出さない", async () => {
		render(<ShoppingList repository={dexieShoppingRepository} />);

		await screen.findByText("買うものはまだありません。");

		expect(
			screen.queryByRole("button", { name: "レシピから入れる" }),
		).toBeNull();
	});

	it("通常のメモに入れると、一覧に出る", async () => {
		const user = userEvent.setup();

		render(
			<ShoppingList
				repository={dexieShoppingRepository}
				renderRecipePicker={renderPicker}
			/>,
		);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "レシピから入れる" }));
		await user.click(
			screen.getByRole("button", { name: "カレーの材料を入れる" }),
		);

		expect(
			await screen.findByRole("checkbox", { name: "じゃがいもをチェック" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "ピッカーを閉じる" }));

		expect(
			screen.getByRole("button", { name: "レシピから入れる" }),
		).toBeInTheDocument();
	});

	it("条件つきのメモの側に入れると、その側に出て、呼び名が空ならレシピの名前になる。呼び名があれば変えない", async () => {
		const user = userEvent.setup();
		const branch = createShoppingBranch(
			{ condition: "売っていたら", elseLabel: "チキン南蛮" },
			0,
		);

		await dexieShoppingBranchRepository.create(
			branch,
			createShoppingItem({
				name: "合い挽き",
				branchId: branch.id,
				branchSide: "condition",
			}),
		);

		render(
			<ShoppingList
				repository={dexieShoppingRepository}
				renderRecipePicker={renderPicker}
			/>,
		);

		const card = (
			await screen.findByRole("heading", { name: /合い挽き.*が売っていたら/ })
		).closest("section") as HTMLElement;

		await user.click(within(card).getByRole("button", { name: /中身を見る/ }));
		await user.click(
			within(card).getByRole("button", { name: "そうならに追加" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "レシピから入れる" }),
		);
		await user.click(
			screen.getByRole("button", { name: "カレーの材料を入れる" }),
		);

		await waitFor(() => {
			expect(within(card).getByText(/じゃがいも/)).toBeInTheDocument();
		});
		// 呼び名が空だった側は、レシピの名前になる（件数のタグに出る）。
		await waitFor(() => {
			expect(within(card).getByText(/^カレー \d+件$/)).toBeInTheDocument();
		});
		// 通常の一覧には出ない。
		expect(
			screen.queryByRole("checkbox", { name: "じゃがいもをチェック" }),
		).toBeNull();
		// もう一方の側の呼び名は、そのまま。
		expect(within(card).getByText("チキン南蛮 0件")).toBeInTheDocument();
	});
});
