import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeDetail } from "../application/recipe-repository";
import { createRecipeEditorDocument } from "../domain/recipe-editor-document";
import { RecipeLinkPreview } from "./recipe-link-preview";

afterEach(cleanup);

function detail(
	publicId: string,
	name: string,
	instruction: string,
	linkViews: RecipeDetail["linkViews"] = [],
): RecipeDetail {
	return {
		...createRecipeEditorDocument({
			name,
			ingredientText: "卵 2個",
			instructionText: `1. ${instruction}`,
		}),
		publicId,
		linkViews,
	};
}

const recipes: Record<string, RecipeDetail> = {
	a: detail("a", "カレー丼", "[[ごはん]]に[[カレー]]をかける", [
		{ label: "ごはん", target: { publicId: "rice", name: "白ごはん" } },
		{ label: "カレー", target: { publicId: "gone", name: "消えるカレー" } },
	]),
	rice: detail("rice", "白ごはん", "炊く"),
};

function setup(initial = "a") {
	const loadRecipe = vi.fn(
		async (publicId: string) => recipes[publicId] ?? null,
	);
	const onClose = vi.fn();

	render(
		<RecipeLinkPreview
			initialPublicId={initial}
			loadRecipe={loadRecipe}
			renderOpenLink={(publicId) => (
				<a href={`/recipes/${publicId}`}>レシピを開く</a>
			)}
			onClose={onClose}
		/>,
	);

	return { loadRecipe, onClose, user: userEvent.setup() };
}

describe("RecipeLinkPreview", () => {
	it("リンク先のレシピを、読み込んで、読み取り専用で出す。「レシピを開く」のリンクがある", async () => {
		setup();

		const dialog = await screen.findByRole("dialog", { name: "カレー丼" });

		expect(within(dialog).getByText("卵")).toBeTruthy();
		expect(
			within(dialog)
				.getByRole("link", { name: "レシピを開く" })
				.getAttribute("href"),
		).toBe("/recipes/a");
	});

	it("中のリンクも押せて、枠の中身が替わり、「戻る」で戻る", async () => {
		const { user } = setup();

		await screen.findByRole("dialog", { name: "カレー丼" });
		await user.click(screen.getByRole("button", { name: "白ごはん" }));

		expect(
			await screen.findByRole("dialog", { name: "白ごはん" }),
		).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "レシピを開く" }).getAttribute("href"),
		).toBe("/recipes/rice");

		await user.click(screen.getByRole("button", { name: "戻る" }));

		expect(
			await screen.findByRole("dialog", { name: "カレー丼" }),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "戻る" })).toBeNull();
	});

	it("一度読み込んだレシピは、戻ったときに、読み込み直さない", async () => {
		const { loadRecipe, user } = setup();

		await screen.findByRole("dialog", { name: "カレー丼" });
		await user.click(screen.getByRole("button", { name: "白ごはん" }));
		await screen.findByRole("dialog", { name: "白ごはん" });
		await user.click(screen.getByRole("button", { name: "戻る" }));
		await screen.findByRole("dialog", { name: "カレー丼" });

		expect(loadRecipe.mock.calls.map(([id]) => id)).toEqual(["a", "rice"]);
	});

	it("リンク先が見つからないレシピは、「見つかりません」と出す。見つからないリンクは、押せない", async () => {
		const { user } = setup();

		await screen.findByRole("dialog", { name: "カレー丼" });

		// 削除されたリンクの表示は、リンク先がないものとして扱う（ここでは、消えるカレーを、押せるリンクとして、持っている）。
		await user.click(screen.getByRole("button", { name: "消えるカレー" }));

		expect(await screen.findByText("レシピが見つかりません。")).toBeTruthy();
	});

	it("読み込みに失敗したら、その旨を出す", async () => {
		const loadRecipe = vi.fn(async () => {
			throw new Error("network");
		});

		render(
			<RecipeLinkPreview
				initialPublicId="a"
				loadRecipe={loadRecipe}
				renderOpenLink={() => null}
				onClose={vi.fn()}
			/>,
		);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"読み込めませんでした",
		);
	});

	it("Esc・「閉じる」・枠の外で、閉じる", async () => {
		const { onClose, user } = setup();

		await screen.findByRole("dialog", { name: "カレー丼" });
		await user.keyboard("{Escape}");
		await user.click(
			screen.getAllByRole("button", { name: "閉じる" })[0] as HTMLElement,
		);
		await user.click(
			screen.getAllByRole("button", { name: "閉じる" })[1] as HTMLElement,
		);

		expect(onClose).toHaveBeenCalledTimes(3);
	});

	it("開いたとき、フォーカスはプレビューの中に移る", async () => {
		setup();

		const dialog = await screen.findByRole("dialog", { name: "カレー丼" });

		expect(dialog.contains(document.activeElement)).toBe(true);
	});

	it("他の人のレシピには、作者を出す。自分のレシピには出さない", async () => {
		recipes.other = {
			...detail("other", "たろうのカレー", "煮る"),
			author: { name: "たろう", handle: "taro" },
		};

		setup("other");

		expect(await screen.findByText("たろう")).toBeInTheDocument();
		expect(screen.getByText("@taro")).toBeInTheDocument();

		cleanup();
		setup("rice");

		await screen.findByText("白ごはん");

		expect(screen.queryByText(/作者：/u)).toBeNull();
	});

	it("前もって取ってあるレシピは、読み込みを待たずに出し、取り直さない", () => {
		const loadRecipe = vi.fn(async () => null);

		render(
			<RecipeLinkPreview
				initialPublicId="rice"
				loadRecipe={loadRecipe}
				preloadedRecipes={{ rice: recipes.rice }}
				renderOpenLink={() => null}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("dialog", { name: "白ごはん" })).toBeTruthy();
		expect(loadRecipe).not.toHaveBeenCalled();
	});

	it("「レシピを開く」を押したら、プレビューを閉じる（別のタブで開いても、元のタブに残さない）", async () => {
		const onClose = vi.fn();

		render(
			<RecipeLinkPreview
				initialPublicId="rice"
				loadRecipe={vi.fn(async () => null)}
				preloadedRecipes={{ rice: recipes.rice }}
				renderOpenLink={(publicId) => <a href={`#${publicId}`}>レシピを開く</a>}
				onClose={onClose}
			/>,
		);

		await userEvent.click(screen.getByRole("link", { name: "レシピを開く" }));

		await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});
});
