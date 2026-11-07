import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
	PublicRecipePage,
	PublicRecipeSummary,
} from "../domain/public-recipe-search";
import type { PublicRecipeTag } from "../domain/recipe-tags";
import { PublicRecipeList } from "./public-recipe-list";

// リンクは、ルーターの外では、描画できないため、差し替える。
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
	}: {
		children: React.ReactNode;
		params: { publicId: string };
	}) => <a href={`/recipes/${params.publicId}`}>{children}</a>,
}));

afterEach(cleanup);

function recipe(
	publicId: string,
	name: string,
	overrides: Partial<PublicRecipeSummary> = {},
): PublicRecipeSummary {
	return {
		publicId,
		name,
		yieldText: "2人分",
		cover: null,
		publicTags: [],
		createdAt: "2026-10-23T00:00:00.000Z",
		authorName: "作者",
		authorHandle: "author",
		authorAvatar: {
			background: "mint",
			placements: [{ partId: "tomato", x: 50, y: 50 }],
		},
		...overrides,
	};
}

function renderList(
	initialPage: PublicRecipePage,
	options: {
		query?: string;
		tags?: PublicRecipeTag[];
		onSearch?: (query: string, tags: PublicRecipeTag[]) => void;
		loadMore?: (cursor: string) => Promise<PublicRecipePage>;
	} = {},
) {
	return render(
		<PublicRecipeList
			query={options.query ?? ""}
			tags={options.tags ?? []}
			initialPage={initialPage}
			onSearch={options.onSearch ?? vi.fn()}
			loadMore={options.loadMore ?? vi.fn()}
		/>,
	);
}

describe("PublicRecipeList", () => {
	it("レシピ名・何人分・作者を出し、材料の数は出さず、レシピへのリンクにする", () => {
		renderList({
			recipes: [recipe("r1", "親子丼", { authorName: "たろう" })],
			nextCursor: null,
		});

		expect(screen.getByRole("link", { name: "親子丼" })).toHaveAttribute(
			"href",
			"/recipes/r1",
		);
		expect(screen.getByText("たろう（@author）")).toBeInTheDocument();
		expect(screen.getByText("2人分")).toBeInTheDocument();
		expect(screen.queryByText(/^材料/u)).toBeNull();
		expect(screen.queryByRole("button", { name: "もっと見る" })).toBeNull();
	});

	it("検索語を入れて送ると、前後の空白を除いて、検索を依頼する", async () => {
		const user = userEvent.setup();
		const onSearch = vi.fn();

		renderList({ recipes: [], nextCursor: null }, { onSearch });

		await user.type(screen.getByRole("searchbox"), "  卵  ");
		await user.click(screen.getByRole("button", { name: "探す" }));

		expect(onSearch).toHaveBeenCalledWith("卵", []);
	});

	it("タグのシートで選んだタグで、いまの検索語のまま探す（選んだ途中では、探さない）", async () => {
		const user = userEvent.setup();
		const onSearch = vi.fn();

		renderList({ recipes: [], nextCursor: null }, { query: "卵", onSearch });

		await user.click(screen.getByRole("button", { name: "タグで絞る" }));
		await user.click(screen.getByText("料理の分類"));
		await user.click(screen.getByRole("button", { name: "主菜" }));
		await user.click(screen.getByRole("button", { name: "時短" }));

		expect(onSearch).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "この条件で探す" }));

		// 語の一覧の順にそろえる。
		expect(onSearch).toHaveBeenCalledWith("卵", ["main_dish", "quick"]);
	});

	it("選んでいるタグを押すと、そのタグだけを外して探し、検索の送信ではタグを保つ", async () => {
		const user = userEvent.setup();
		const onSearch = vi.fn();

		renderList(
			{ recipes: [], nextCursor: null },
			{ query: "卵", tags: ["main_dish", "quick"], onSearch },
		);

		await user.click(
			screen.getByRole("button", { name: "主菜の絞り込みを外す" }),
		);

		expect(onSearch).toHaveBeenLastCalledWith("卵", ["quick"]);

		await user.click(screen.getByRole("button", { name: "探す" }));

		expect(onSearch).toHaveBeenLastCalledWith("卵", ["main_dish", "quick"]);
		expect(
			screen.getByText("「卵」に合うレシピは見つかりませんでした。"),
		).toBeInTheDocument();
	});

	it("結果がないときの文は、検索語の有無で変わる", () => {
		const { unmount } = renderList({ recipes: [], nextCursor: null });

		expect(
			screen.getByText("まだ、ほかの人が公開したレシピはありません。"),
		).toBeInTheDocument();

		unmount();
		renderList({ recipes: [], nextCursor: null }, { query: "卵" });

		expect(
			screen.getByText("「卵」に合うレシピは見つかりませんでした。"),
		).toBeInTheDocument();
	});

	it("「もっと見る」で続きを足し、重なったレシピは出さず、続きがなくなったらボタンを消す", async () => {
		const user = userEvent.setup();
		const loadMore = vi.fn(async (_cursor: string) => ({
			recipes: [recipe("r2", "カレー"), recipe("r1", "親子丼")],
			nextCursor: null,
		}));

		renderList(
			{ recipes: [recipe("r1", "親子丼")], nextCursor: "cursor-1" },
			{ loadMore },
		);

		await user.click(screen.getByRole("button", { name: "もっと見る" }));

		expect(loadMore).toHaveBeenCalledWith("cursor-1");
		expect(await screen.findByRole("link", { name: "カレー" })).toBeTruthy();
		expect(screen.getAllByRole("link", { name: "親子丼" })).toHaveLength(1);
		expect(screen.queryByRole("button", { name: "もっと見る" })).toBeNull();
	});

	it("続きの読み込みに失敗したら、文を出し、もう一度押せる", async () => {
		const user = userEvent.setup();
		const loadMore = vi
			.fn<(cursor: string) => Promise<PublicRecipePage>>()
			.mockRejectedValueOnce(new Error("network"))
			.mockResolvedValueOnce({
				recipes: [recipe("r2", "カレー")],
				nextCursor: null,
			});

		renderList(
			{ recipes: [recipe("r1", "親子丼")], nextCursor: "cursor-1" },
			{ loadMore },
		);

		await user.click(screen.getByRole("button", { name: "もっと見る" }));

		const alert = await screen.findByRole("alert");

		expect(within(alert).getByText(/続きを読み込めませんでした/u)).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "もっと見る" }));

		expect(await screen.findByRole("link", { name: "カレー" })).toBeTruthy();
		expect(screen.queryByRole("alert")).toBeNull();
	});
});
