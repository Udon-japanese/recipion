import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import type { ShoppingRepository } from "#/features/shopping/application/shopping-repository";
import {
	createShoppingItem,
	type ShoppingItem,
} from "#/features/shopping/domain/shopping-item";
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

function createRepository(items: ShoppingItem[] = []): ShoppingRepository & {
	saved: ShoppingItem[];
} {
	const state = { items: [...items], saved: [] as ShoppingItem[] };

	return {
		get saved() {
			return state.saved;
		},
		list: vi.fn(async () => [...state.items]),
		findById: vi.fn(),
		save: vi.fn(),
		saveAll: vi.fn(async (toSave: readonly ShoppingItem[]) => {
			state.saved = [...toSave];
			for (const item of toSave) {
				state.items = [
					...state.items.filter((current) => current.id !== item.id),
					item,
				];
			}
		}),
		remove: vi.fn(),
	};
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "買い物メモに入れる" }));

	return screen.findByRole("region", { name: "買い物メモに入れる" });
}

describe("RecipeShoppingSection", () => {
	it("在庫と比べて、足りないものにチェックを入れ、選んだものを買い物メモに追加する", async () => {
		const user = userEvent.setup();
		const repository = createRepository();

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

		await waitFor(() => expect(repository.saved).toHaveLength(1));
		expect(repository.saved[0]).toMatchObject({
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
		const repository = createRepository([existing]);

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

		await waitFor(() => expect(repository.saved).toHaveLength(1));
		expect(repository.saved[0]).toMatchObject({
			id: existing.id,
			quantity: 3,
		});
		expect(await panel.findByText(/1件の数量を更新/u)).toBeInTheDocument();
	});

	it("メモの数量が、レシピの量より多いときは、変更なしで、チェックできず、その理由を表示する", async () => {
		const user = userEvent.setup();
		const repository = createRepository([
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
				shoppingRepository={createRepository()}
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
				shoppingRepository={createRepository()}
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
				shoppingRepository={createRepository()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
