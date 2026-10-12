import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import type { RecipeDetail } from "../application/recipe-repository";
import { createRecipeEditorDocument } from "../domain/recipe-editor-document";
import { RecipeToShoppingPicker } from "./recipe-to-shopping-picker";

const targets = [
	{ publicId: "curry", name: "カレー", createdAt: "2026-10-01T00:00:00.000Z" },
	{ publicId: "salad", name: "サラダ", createdAt: "2026-10-02T00:00:00.000Z" },
];

function detail(
	publicId: string,
	name: string,
	ingredientText: string,
): RecipeDetail {
	return {
		...createRecipeEditorDocument({ name, ingredientText }),
		publicId,
		linkViews: [],
	};
}

const recipes: Record<string, RecipeDetail> = {
	curry: detail("curry", "カレー", "玉ねぎ 2個\n卵 3個"),
	salad: detail("salad", "サラダ", "きゅうり 1本"),
};

function setup(
	options: { destination?: { branchId: string; side: "then" | "else" } } = {},
) {
	const repository = createFakeShoppingRepository();
	const onClose = vi.fn();
	const onApplied = vi.fn();

	render(
		<RecipeToShoppingPicker
			context={{
				repository,
				destination: options.destination,
				onClose,
				onApplied,
			}}
			ownerScope="user:user-id"
			listRecipes={async () => targets}
			loadRecipe={async (publicId) => recipes[publicId] ?? null}
			loadInventoryItems={async () => []}
		/>,
	);

	return { repository, onClose, onApplied };
}

describe("RecipeToShoppingPicker", () => {
	it("自分のレシピだけを選べることと、他の人のレシピは今後対応することを案内する", async () => {
		setup();

		expect(
			await screen.findByRole("button", { name: "カレー" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/他の人のレシピから入れる機能は、今後対応する予定です/u),
		).toBeInTheDocument();
	});

	it("名前で絞り込める", async () => {
		const user = userEvent.setup();

		setup();

		await screen.findByRole("button", { name: "カレー" });
		await user.type(screen.getByLabelText("レシピの名前で絞り込む"), "さら");

		expect(screen.queryByRole("button", { name: "カレー" })).toBeNull();
		expect(screen.getByRole("button", { name: "サラダ" })).toBeInTheDocument();
	});

	it("レシピを選んで、材料を通常のメモに入れる", async () => {
		const user = userEvent.setup();
		const { repository, onApplied } = setup();

		await user.click(await screen.findByRole("button", { name: "カレー" }));

		const panel = within(
			await screen.findByRole("region", { name: "買い物メモに入れる" }),
		);

		await waitFor(() =>
			expect(panel.getByLabelText("玉ねぎを買い物メモに入れる")).toBeChecked(),
		);
		await user.click(
			panel.getByRole("button", { name: "選んだものを入れる（2件）" }),
		);

		await waitFor(() => expect(repository.items).toHaveLength(2));
		expect(repository.items.map((item) => [item.name, item.branchId])).toEqual([
			["玉ねぎ", null],
			["卵", null],
		]);
		expect(onApplied).toHaveBeenCalledWith("カレー");
		// 買い物メモの画面の中なので、「買い物メモを開く」のリンクは出さない。
		expect(screen.queryByRole("link", { name: "買い物メモを開く" })).toBeNull();
	});

	it("入れ先が条件つきのメモの側なら、その側の項目として入る", async () => {
		const user = userEvent.setup();
		const { repository } = setup({
			destination: { branchId: "branch-1", side: "then" },
		});

		await user.click(await screen.findByRole("button", { name: "カレー" }));

		const panel = within(
			await screen.findByRole("region", { name: "買い物メモに入れる" }),
		);

		await waitFor(() =>
			expect(panel.getByLabelText("玉ねぎを買い物メモに入れる")).toBeChecked(),
		);
		await user.click(
			panel.getByRole("button", { name: "選んだものを入れる（2件）" }),
		);

		await waitFor(() => expect(repository.items).toHaveLength(2));
		expect(
			repository.items.map((item) => [item.branchId, item.branchSide]),
		).toEqual([
			["branch-1", "then"],
			["branch-1", "then"],
		]);
	});

	it("一覧を読み込めなかったときは、エラーを表示する", async () => {
		render(
			<RecipeToShoppingPicker
				context={{
					repository: createFakeShoppingRepository(),
					onClose: vi.fn(),
					onApplied: vi.fn(),
				}}
				ownerScope="user:user-id"
				listRecipes={async () => {
					throw new Error("offline");
				}}
				loadRecipe={async () => null}
				loadInventoryItems={async () => []}
			/>,
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"レシピの一覧を読み込めませんでした",
		);
	});
});
