import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import { createShoppingItem } from "#/features/shopping/domain/shopping-item";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import type { RecipeDetail } from "../application/recipe-repository";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import { RecipeShoppingSection } from "./recipe-shopping-section";

// 「買い物メモを開く」のリンクは、ルーターの外では、描画できないため、差し替える。
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/shopping">{children}</a>
	),
}));

function ingredient(
	id: string,
	name: string,
	quantity: number | null,
	unitLabel: string | null,
	amountText: string | null,
): RecipeEditorIngredientNode {
	return {
		type: "ingredient",
		id,
		status: amountText ? "parsed" : "missing-amount",
		rawText: `${name} ${amountText ?? ""}`.trim(),
		name,
		amountText,
		quantity,
		unitLabel,
	} as RecipeEditorIngredientNode;
}

const ingredients: RecipeEditorIngredientNode[] = [
	ingredient("i1", "玉ねぎ", 3, "個", "3個"),
	ingredient("i2", "塩", null, null, "少々"),
	ingredient("i3", "卵", 2, "個", "2個"),
];

function stockItem(
	name: string,
	quantity: number,
	stockUnitCode: "count" | "g" | "ml",
	stockUnitLabel: string,
): InventoryListItem {
	return {
		inventoryItemId: `item-${name}`,
		ingredientId: `ingredient-${name}`,
		name,
		quantity,
		lots: [],
		stockUnitCode,
		stockUnitLabel,
		trackingMode: "estimated",
		defaultExpiryKind: null,
		defaultStorage: null,
		updatedAt: "2026-10-05T00:00:00.000Z",
	};
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "買い物メモに入れる" }));

	return screen.findByRole("region", { name: "買い物メモに入れる" });
}

describe("RecipeShoppingSection", () => {
	it("在庫と比べて、足りないものにチェックを入れ、選んだものを買い物メモに追加する", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(
			<RecipeShoppingSection
				ingredients={ingredients}
				ownerScope="user:user-id"
				loadInventoryItems={async () => [
					stockItem("玉ねぎ", 1, "count", "個"),
					stockItem("塩", 300, "g", "g"),
					stockItem("卵", 6, "count", "個"),
				]}
				shoppingRepository={repository}
			/>,
		);

		const panel = within(await openPanel(user));

		// 玉ねぎはあと2個。塩（少々）と卵は、足りている
		await waitFor(() =>
			expect(panel.getByLabelText("玉ねぎを買い物メモに入れる")).toBeChecked(),
		);
		expect(panel.getByText("あと 2個")).toBeInTheDocument();
		expect(panel.getByLabelText("塩を買い物メモに入れる")).not.toBeChecked();
		expect(panel.getByLabelText("卵を買い物メモに入れる")).not.toBeChecked();
		expect(panel.getByText("足りている（在庫あり）")).toBeInTheDocument();

		await user.click(
			panel.getByRole("button", { name: "選んだものを入れる（1件）" }),
		);

		await waitFor(() => expect(repository.items).toHaveLength(1));
		expect(repository.items[0]).toMatchObject({
			name: "玉ねぎ",
			quantity: 2,
			unitLabel: "個",
		});
		expect(await panel.findByText(/1件を追加/u)).toBeInTheDocument();
	});

	it("メモに同じものがあるとき、既定は多い方に合わせ、選択で合算・追加しないに変えられる", async () => {
		const user = userEvent.setup();
		const existing = createShoppingItem({
			name: "玉ねぎ",
			quantity: 1,
			unitLabel: "個",
		});
		const repository = createFakeShoppingRepository([existing]);

		render(
			<RecipeShoppingSection
				ingredients={[ingredients[0] as RecipeEditorIngredientNode]}
				ownerScope="user:user-id"
				loadInventoryItems={async () => [stockItem("玉ねぎ", 0, "count", "個")]}
				shoppingRepository={repository}
			/>,
		);

		const panel = within(await openPanel(user));

		// 多い方：メモ1個 → 3個に更新
		expect(
			await panel.findByText(/メモに「玉ねぎ 1個」あり → 3個に更新/u),
		).toBeInTheDocument();

		// 合算：1 + 3 = 4個
		await user.selectOptions(
			panel.getByLabelText("メモに同じものがあるとき"),
			"sum",
		);
		expect(
			panel.getByText(/メモに「玉ねぎ 1個」あり → 4個に更新/u),
		).toBeInTheDocument();

		// 追加しない
		await user.selectOptions(
			panel.getByLabelText("メモに同じものがあるとき"),
			"skip",
		);
		expect(panel.getByLabelText("玉ねぎを買い物メモに入れる")).toBeDisabled();

		// 多い方に戻して、更新する
		await user.selectOptions(
			panel.getByLabelText("メモに同じものがあるとき"),
			"max",
		);
		await user.click(
			panel.getByRole("button", { name: "選んだものを入れる（1件）" }),
		);

		await waitFor(() => expect(repository.items).toHaveLength(1));
		expect(repository.items[0]).toMatchObject({
			id: existing.id,
			quantity: 3,
		});
		expect(await panel.findByText(/1件の数量を更新/u)).toBeInTheDocument();
	});

	it("メモの数量が、レシピの量より多いときは、変更なしで、チェックできず、その理由を表示する", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository([
			createShoppingItem({ name: "キャベツ", quantity: 220, unitLabel: "g" }),
		]);

		render(
			<RecipeShoppingSection
				ingredients={[ingredient("i4", "キャベツ", 120, "g", "120g")]}
				ownerScope="user:user-id"
				loadInventoryItems={async () => []}
				shoppingRepository={repository}
			/>,
		);

		const panel = within(await openPanel(user));

		expect(
			await panel.findByText(
				/メモに「キャベツ 220g」あり（メモの数量で足りているため、変更なし）/u,
			),
		).toBeInTheDocument();
		expect(panel.getByLabelText("キャベツを買い物メモに入れる")).toBeDisabled();

		await user.selectOptions(
			panel.getByLabelText("メモに同じものがあるとき"),
			"skip",
		);

		expect(
			panel.getByText(/「追加しない」の設定のため、そのまま/u),
		).toBeInTheDocument();
	});

	it("ゲストは、在庫の情報がないので、すべてチェックされ、ログインの案内を出す", async () => {
		const user = userEvent.setup();

		render(
			<RecipeShoppingSection
				ingredients={ingredients}
				ownerScope="guest"
				shoppingRepository={createFakeShoppingRepository()}
			/>,
		);

		const panel = within(await openPanel(user));

		expect(
			panel.getByText(/ログインすると、在庫と比べて/u),
		).toBeInTheDocument();
		expect(
			await panel.findByRole("button", { name: "選んだものを入れる（3件）" }),
		).toBeInTheDocument();
		expect(panel.getAllByText("在庫の情報なし")).toHaveLength(3);
	});

	it("在庫にない食材は、「ある」で在庫に登録でき、登録後は、足りている", async () => {
		const user = userEvent.setup();
		let salt: InventoryListItem[] = [];
		const registerAvailable = vi.fn(async () => {
			salt = [stockItem("塩", 1, "g", "g")];
		});

		render(
			<RecipeShoppingSection
				ingredients={[ingredients[1] as RecipeEditorIngredientNode]}
				ownerScope="user:user-id"
				loadInventoryItems={async () => salt}
				registerAvailable={registerAvailable}
				shoppingRepository={createFakeShoppingRepository()}
			/>,
		);

		const panel = within(await openPanel(user));

		expect(await panel.findByText("在庫なし")).toBeInTheDocument();

		await user.click(
			panel.getByRole("button", { name: "塩を在庫に「ある」で登録する" }),
		);

		expect(registerAvailable).toHaveBeenCalledWith("塩");
		expect(
			await panel.findByText("足りている（在庫あり）"),
		).toBeInTheDocument();
		expect(panel.getByLabelText("塩を買い物メモに入れる")).not.toBeChecked();
	});

	it("材料がないレシピでは、何も表示しない", () => {
		const { container } = render(
			<RecipeShoppingSection
				ingredients={[]}
				ownerScope="guest"
				shoppingRepository={createFakeShoppingRepository()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("リンクした材料は、リンク先のレシピの材料に展開して、在庫と比べる。削除されたリンク先は、候補にしない", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();
		const loadLinkedRecipe = vi.fn(async (publicId: string) =>
			publicId === "d"
				? ({
						name: "和風ドレッシング",
						ingredients: [
							ingredient("d1", "醤油", 100, "ml", "100ml"),
							ingredient("d2", "酢", 50, "ml", "50ml"),
						],
						linkViews: [],
					} as unknown as RecipeDetail)
				: null,
		);

		render(
			<RecipeShoppingSection
				ingredients={[
					ingredient("i1", "玉ねぎ", 1, "個", "1個"),
					ingredient("i2", "[[自家製ドレッシング]]", null, null, null),
					ingredient("i3", "[[消えたレシピ]]", null, null, null),
				]}
				linkViews={[
					{
						label: "自家製ドレッシング",
						target: { publicId: "d", name: "和風ドレッシング" },
					},
					{ label: "消えたレシピ", target: null },
				]}
				loadLinkedRecipe={loadLinkedRecipe}
				ownerScope="user:user-id"
				loadInventoryItems={async () => [stockItem("酢", 500, "ml", "ml")]}
				shoppingRepository={repository}
			/>,
		);

		const panel = within(await openPanel(user));

		expect(
			await panel.findByText("和風ドレッシングの材料"),
		).toBeInTheDocument();
		// リンクの行そのもの・削除されたリンク先は、候補にならない
		expect(
			panel.queryByLabelText("和風ドレッシングを買い物メモに入れる"),
		).not.toBeInTheDocument();
		expect(panel.queryByText(/消えたレシピ/u)).not.toBeInTheDocument();
		// リンク先の材料は、在庫と比べて、足りないものにチェックが入る
		await waitFor(() =>
			expect(panel.getByLabelText("醤油を買い物メモに入れる")).toBeChecked(),
		);
		expect(panel.getByLabelText("酢を買い物メモに入れる")).not.toBeChecked();
		expect(panel.getByLabelText("玉ねぎを買い物メモに入れる")).toBeChecked();

		await user.click(
			panel.getByRole("button", { name: "選んだものを入れる（2件）" }),
		);

		await waitFor(() => expect(repository.items).toHaveLength(2));
		expect(repository.items.map((item) => item.name).sort()).toEqual([
			"玉ねぎ",
			"醤油",
		]);
	});

	it("冷凍の在庫で足りているときは、その旨を表示し、チェックなしで、選べば入れられる", async () => {
		const user = userEvent.setup();
		const repository = createFakeShoppingRepository();

		render(
			<RecipeShoppingSection
				ingredients={[ingredient("i1", "ブロッコリー", 100, "g", "100g")]}
				ownerScope="user:user-id"
				loadInventoryItems={async () => [
					stockItem("冷凍ブロッコリー", 300, "g", "g"),
				]}
				shoppingRepository={repository}
			/>,
		);

		const panel = within(await openPanel(user));

		expect(
			await panel.findByText("冷凍ブロッコリーの在庫で足りています"),
		).toBeInTheDocument();

		const checkbox = panel.getByLabelText("ブロッコリーを買い物メモに入れる");

		expect(checkbox).not.toBeChecked();

		await user.click(checkbox);
		await user.click(
			panel.getByRole("button", { name: "選んだものを入れる（1件）" }),
		);

		await waitFor(() => expect(repository.items).toHaveLength(1));
		expect(repository.items[0]?.name).toBe("ブロッコリー");
	});

	it("形が決まっている冷凍（みじん切り）の在庫は、足りているとはせず、在庫があることを知らせる", async () => {
		const user = userEvent.setup();

		render(
			<RecipeShoppingSection
				ingredients={[ingredient("i1", "玉ねぎ", 1, "個", "1個")]}
				ownerScope="user:user-id"
				loadInventoryItems={async () => [
					stockItem("冷凍玉ねぎ(みじん切り)", 300, "g", "g"),
				]}
				shoppingRepository={createFakeShoppingRepository()}
			/>,
		);

		const panel = within(await openPanel(user));

		expect(
			await panel.findByText(/冷凍玉ねぎ\(みじん切り\)の在庫があります/u),
		).toBeInTheDocument();
		expect(panel.getByLabelText("玉ねぎを買い物メモに入れる")).toBeChecked();
	});
});
