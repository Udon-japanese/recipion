import { cleanup, render, screen } from "@testing-library/react";
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
		servings: 2,
		visibility: "private",
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

	it("レシピが1つもないときは、検索の欄を出さない", () => {
		render(<RecipeList recipes={[]} />);

		expect(screen.queryByRole("searchbox")).toBeNull();
	});
});
