import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	type BranchCardView,
	ShoppingBranchCard,
} from "./shopping-branch-card";

const branch: BranchCardView = {
	condition: "イオンに合い挽き肉 1パックが売っていたら",
	ifTrue: {
		label: "ハンバーグ",
		items: [{ id: "t1", name: "卵", amount: "10個" }],
	},
	ifFalse: {
		label: null,
		items: [
			{ id: "e1", name: "豚バラ肉", amount: "1パック" },
			{ id: "e2", name: "アボカド", amount: "1個" },
		],
	},
};

function setup() {
	const handlers = {
		onDecide: vi.fn(),
		onEdit: vi.fn(),
		onRemove: vi.fn(),
		onRemoveItem: vi.fn(),
		onAdd: vi.fn(),
		onBulkAdd: vi.fn(),
	};

	render(<ShoppingBranchCard branch={branch} {...handlers} />);

	return handlers;
}

describe("ShoppingBranchCard", () => {
	it("ふだんは、条件と、2つの側の件数と、決めるボタンだけを見せる（材料の行は出さない）", () => {
		setup();

		expect(
			screen.getByRole("heading", {
				name: "イオンに合い挽き肉 1パックが売っていたら",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("ハンバーグ 1件")).toBeInTheDocument();
		expect(screen.getByText("そうでなければ 2件")).toBeInTheDocument();
		expect(screen.queryByText("豚バラ肉")).toBeNull();
	});

	it("「そうだった」「ちがった」は、側を渡して決める", async () => {
		const user = userEvent.setup();
		const { onDecide } = setup();

		await user.click(screen.getByRole("button", { name: "そうだった" }));
		await user.click(screen.getByRole("button", { name: "ちがった" }));

		expect(onDecide.mock.calls).toEqual([["then"], ["else"]]);
	});

	it("中身を見ると、タブで1側ずつ材料が出て、材料を消せる", async () => {
		const user = userEvent.setup();
		const { onRemoveItem } = setup();

		await user.click(screen.getByRole("button", { name: /中身を見る/u }));

		expect(screen.getByText("卵")).toBeInTheDocument();
		expect(screen.queryByText("豚バラ肉")).toBeNull();

		await user.click(screen.getByRole("button", { name: /そうでなければ 2/u }));

		expect(screen.getByText("豚バラ肉")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "豚バラ肉を削除（そうでなければ）" }),
		);

		expect(onRemoveItem).toHaveBeenCalledWith("else", "e1");
	});

	it("「その他」から、条件を直す・削除を選べる", async () => {
		const user = userEvent.setup();
		const { onEdit, onRemove } = setup();

		await user.click(screen.getByRole("button", { name: /のその他/u }));
		await user.click(screen.getByRole("menuitem", { name: "条件を直す" }));

		expect(onEdit).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: /のその他/u }));
		await user.click(screen.getByRole("menuitem", { name: "削除する" }));

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it("追加は、いま見ている側に入る。「レシピから」は、渡されたときだけ出る", async () => {
		const user = userEvent.setup();
		const { onAdd } = setup();

		await user.click(screen.getByRole("button", { name: /中身を見る/u }));
		await user.click(screen.getByRole("button", { name: "ハンバーグに追加" }));

		expect(
			screen.queryByRole("menuitem", { name: "レシピから入れる" }),
		).toBeNull();

		await user.click(screen.getByRole("menuitem", { name: "1つ追加" }));

		expect(onAdd).toHaveBeenCalledWith("then");
		expect(within(document.body).queryByRole("menu")).toBeNull();
	});
});
