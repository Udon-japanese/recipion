import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeSummary } from "../application/recipe-repository";
import type { OwnRecipeTagFilter } from "../domain/filter-own-recipes";
import { RecipeList } from "./recipe-list";

// リンクは、ルーターの外では、描画できないため、差し替える。
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		to: string;
		params?: { publicId: string };
		"aria-label"?: string;
	}) => (
		<a
			href={params ? `/recipes/${params.publicId}` : to}
			aria-label={ariaLabel}
		>
			{children}
		</a>
	),
}));

afterEach(cleanup);

function recipe(publicId: string, name: string): RecipeSummary {
	return {
		publicId,
		name,
		yieldText: "2人分",
		visibility: "private",
		cover: null,
		publicTags: [],
		personalTags: [],
		createdAt: "2026-10-23T00:00:00.000Z",
	};
}

// タグの絞り込みは履歴（ルート）が持つため、テストでは、その代わりに state で持つ。
function RecipeListWithTagState(
	props: Omit<
		ComponentProps<typeof RecipeList>,
		"query" | "onQueryChange" | "tagFilters" | "onTagFiltersChange"
	> & { initialTagFilters?: OwnRecipeTagFilter[] },
) {
	const { initialTagFilters = [], ...rest } = props;
	const [tagFilters, setTagFilters] =
		useState<OwnRecipeTagFilter[]>(initialTagFilters);

	return (
		<RecipeList
			{...rest}
			query=""
			onQueryChange={vi.fn()}
			tagFilters={tagFilters}
			onTagFiltersChange={setTagFilters}
		/>
	);
}

const taggedRecipes: RecipeSummary[] = [
	{
		...recipe("a", "豚の生姜焼き"),
		publicTags: ["main_dish", "quick"],
		personalTags: ["晩ご飯"],
	},
	{
		...recipe("b", "ハンバーグ"),
		publicTags: ["main_dish"],
		personalTags: [],
	},
	recipe("c", "味噌汁"),
];

describe("RecipeList の自分のレシピの検索", () => {
	it("名前で絞り込み、合うものがなければ、そう伝える", async () => {
		const user = userEvent.setup();

		render(
			<RecipeList
				query=""
				onQueryChange={vi.fn()}
				tagFilters={[]}
				onTagFiltersChange={vi.fn()}
				recipes={[recipe("a", "豚の生姜焼き"), recipe("b", "ハンバーグ")]}
			/>,
		);

		await user.type(screen.getByRole("searchbox"), "はんばーぐ");

		expect(screen.getByText("ハンバーグ")).toBeInTheDocument();
		expect(screen.queryByText("豚の生姜焼き")).toBeNull();

		await user.clear(screen.getByRole("searchbox"));
		await user.type(screen.getByRole("searchbox"), "カレー");

		expect(
			screen.getByText("「カレー」に合うレシピは見つかりませんでした。"),
		).toBeInTheDocument();
		// 検索の欄は、残る（直せる）。
		expect(screen.getByRole("searchbox")).toBeInTheDocument();
	});

	it("検索語は、履歴から来た値（query）を欄の初期値にし、入力のたびに通知する", async () => {
		const user = userEvent.setup();
		const onQueryChange = vi.fn();

		render(
			<RecipeList
				query="ハンバーグ"
				onQueryChange={onQueryChange}
				tagFilters={[]}
				onTagFiltersChange={vi.fn()}
				recipes={[recipe("a", "豚の生姜焼き"), recipe("b", "ハンバーグ")]}
			/>,
		);

		expect(screen.getByRole("searchbox")).toHaveValue("ハンバーグ");
		expect(screen.queryByText("豚の生姜焼き")).toBeNull();

		await user.type(screen.getByRole("searchbox"), "x");

		expect(onQueryChange).toHaveBeenLastCalledWith("ハンバーグx");
	});

	it("履歴の条件を読み直したとき（restoreKey が変わったとき）だけ、欄を query に戻す", async () => {
		const user = userEvent.setup();
		const props = {
			recipes: [recipe("a", "豚の生姜焼き"), recipe("b", "ハンバーグ")],
			onQueryChange: vi.fn(),
			tagFilters: [],
			onTagFiltersChange: vi.fn(),
		};
		const { rerender } = render(
			<RecipeList {...props} query="" restoreKey="1" />,
		);

		await user.type(screen.getByRole("searchbox"), "ハン");
		// 打つたびの書き換えでは、restoreKey は変わらない。欄は、打った文字のまま。
		rerender(<RecipeList {...props} query="ハ" restoreKey="1" />);

		expect(screen.getByRole("searchbox")).toHaveValue("ハン");

		// 戻る・進むで、別の履歴の項目になった。
		rerender(<RecipeList {...props} query="豚" restoreKey="2" />);

		expect(screen.getByRole("searchbox")).toHaveValue("豚");
		expect(screen.queryByText("ハンバーグ")).toBeNull();
	});

	it("使われているタグのチップで絞り込み、選んだタグをすべて持つものだけを残す", async () => {
		const user = userEvent.setup();

		render(<RecipeListWithTagState recipes={taggedRecipes} />);

		const tags = screen.getByRole("group", { name: "タグで絞り込む" });

		// 使われているタグだけ（公開用は語の一覧の順、個人用はそのあと）。
		expect(
			within(tags)
				.getAllByRole("button")
				.map((button) => button.textContent),
		).toEqual(["主菜", "時短", "晩ご飯"]);

		await user.click(within(tags).getByRole("button", { name: "主菜" }));

		expect(screen.getByText("ハンバーグ")).toBeInTheDocument();
		expect(screen.queryByText("味噌汁")).toBeNull();

		await user.click(within(tags).getByRole("button", { name: "晩ご飯" }));

		expect(screen.getByText("豚の生姜焼き")).toBeInTheDocument();
		expect(screen.queryByText("ハンバーグ")).toBeNull();
	});

	it("履歴から来たタグ（tagFilters）で絞った状態で開き、もう使われていないタグは、押したときに捨てる", async () => {
		const user = userEvent.setup();
		const onTagFiltersChange = vi.fn();

		render(
			<RecipeList
				recipes={taggedRecipes}
				query=""
				onQueryChange={vi.fn()}
				tagFilters={[
					{ kind: "public", tag: "main_dish" },
					{ kind: "personal", tag: "消したタグ" },
				]}
				onTagFiltersChange={onTagFiltersChange}
			/>,
		);

		const tags = screen.getByRole("group", { name: "タグで絞り込む" });

		expect(within(tags).getByRole("button", { name: "主菜" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByText("ハンバーグ")).toBeInTheDocument();
		expect(screen.queryByText("味噌汁")).toBeNull();

		await user.click(within(tags).getByRole("button", { name: "時短" }));

		expect(onTagFiltersChange).toHaveBeenLastCalledWith([
			{ kind: "public", tag: "main_dish" },
			{ kind: "public", tag: "quick" },
		]);
	});

	it("履歴の条件を読めるまで（isRestoring）は、一覧も検索の欄も出さない（全件を一瞬見せない）", () => {
		render(
			<RecipeList
				recipes={[recipe("a", "豚の生姜焼き")]}
				query=""
				onQueryChange={vi.fn()}
				tagFilters={[]}
				onTagFiltersChange={vi.fn()}
				isRestoring
			/>,
		);

		expect(screen.getByRole("status")).toHaveTextContent("よみこみ中...");
		expect(screen.queryByText("豚の生姜焼き")).toBeNull();
		expect(screen.queryByRole("searchbox")).toBeNull();
	});

	it("レシピが1つもないときは、検索の欄を出さない", () => {
		render(
			<RecipeList
				recipes={[]}
				query=""
				onQueryChange={vi.fn()}
				tagFilters={[]}
				onTagFiltersChange={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("searchbox")).toBeNull();
	});
});
