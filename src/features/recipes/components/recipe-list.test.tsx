import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeSummary } from "../application/recipe-repository";
import { RecipeList } from "./recipe-list";

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

vi.mock("#/components/button/button-link", () => ({
	ButtonLink: ({ children }: { children: React.ReactNode }) => (
		<a href="/recipes/new">{children}</a>
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

describe("RecipeList の自分のレシピの検索", () => {
	it("名前で絞り込み、合うものがなければ、そう伝える", async () => {
		const user = userEvent.setup();

		render(
			<RecipeList
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

	it("使われているタグのチップで絞り込み、選んだタグをすべて持つものだけを残す", async () => {
		const user = userEvent.setup();

		render(
			<RecipeList
				recipes={[
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
				]}
			/>,
		);

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

	it("レシピが1つもないときは、検索の欄を出さない", () => {
		render(<RecipeList recipes={[]} />);

		expect(screen.queryByRole("searchbox")).toBeNull();
	});
});
