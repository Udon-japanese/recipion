import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeView } from "./recipe-view";

afterEach(cleanup);

const recipe: RecipeDetail = {
	publicId: "abc123",
	name: "つくね",
	servings: 2,
	note: "人数を変えるときはたれを調整する",
	sourceUrl: "https://example.com/recipe/1",
	links: [],
	linkViews: [],
	ingredients: [
		{
			type: "ingredient",
			status: "parsed",
			id: "i1",
			name: "ベーコン",
			rawText: "ベーコン 60~70g",
			amountText: "60~70g",
			quantity: null,
			unitLabel: "g",
		},
		{
			type: "group",
			id: "g1",
			name: "たれ",
			rawText: "たれ",
			inferred: false,
			children: [
				{
					type: "ingredient",
					status: "parsed",
					id: "i2",
					name: "しょうゆ",
					rawText: "しょうゆ 大さじ1と1/2",
					amountText: "大さじ1と1/2",
					quantity: 1.5,
					unitLabel: "大さじ",
				},
			],
		},
	],
	preparations: [{ id: "p1", text: "玉ねぎをみじん切りにする" }],
	instructions: [
		{ id: "s1", text: "材料を混ぜる", referencedInstructionIds: [] },
		{ id: "s2", text: "フライパンで焼く", referencedInstructionIds: [] },
	],
};

describe("RecipeView", () => {
	it("材料のグループ構造と分量の原文、下準備、作り方、メモを表示する", () => {
		render(<RecipeView recipe={recipe} />);

		expect(screen.getByRole("heading", { name: "つくね" })).toBeTruthy();
		expect(screen.getByText("2人分")).toBeTruthy();

		// 範囲の分量も、原文のまま表示される
		expect(screen.getByText("60~70g")).toBeTruthy();

		// グループの中の材料は、グループの見出しの下に入る
		const group = screen.getByText("たれ").closest("li");
		expect(group).not.toBeNull();
		if (group) {
			expect(within(group).getByText("しょうゆ")).toBeTruthy();
			expect(within(group).getByText("大さじ1と1/2")).toBeTruthy();
		}

		expect(screen.getByText("玉ねぎをみじん切りにする")).toBeTruthy();
		const steps = screen
			.getAllByRole("listitem")
			.map((item) => item.textContent);
		expect(steps).toContain("材料を混ぜる");
		expect(steps).toContain("フライパンで焼く");
		expect(screen.getByText("人数を変えるときはたれを調整する")).toBeTruthy();
	});

	it("引用元URLは別タブで開くリンクとして表示し、なければ見出しを出さない", () => {
		const { unmount } = render(<RecipeView recipe={recipe} />);

		const link = screen.getByRole("link", {
			name: "https://example.com/recipe/1",
		});
		expect(link.getAttribute("href")).toBe("https://example.com/recipe/1");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toContain("noopener");

		unmount();
		render(<RecipeView recipe={{ ...recipe, sourceUrl: null }} />);

		expect(screen.queryByRole("heading", { name: "引用元" })).toBeNull();
	});

	it("下準備・作り方・メモがなければ、その見出しを出さない", () => {
		render(
			<RecipeView
				recipe={{
					...recipe,
					preparations: [],
					instructions: [],
					note: "",
				}}
			/>,
		);

		expect(screen.queryByRole("heading", { name: "下準備" })).toBeNull();
		expect(screen.queryByRole("heading", { name: "作り方" })).toBeNull();
		expect(screen.queryByRole("heading", { name: "メモ" })).toBeNull();
	});

	it("本文と材料の [[ラベル]] を、リンクとして出す（押すと onOpenLink、見つからなければ、その旨）", async () => {
		const onOpenLink = vi.fn();
		const withLinks: RecipeDetail = {
			...recipe,
			ingredients: [
				{
					type: "ingredient",
					status: "missing-amount",
					id: "x",
					name: "[[ソース]]",
					rawText: "[[ソース]]",
					amountText: null,
					quantity: null,
					unitLabel: null,
				},
			],
			instructions: [
				{
					id: "s1",
					text: "[[カレー]]を温める。[[消えた]]は使わない",
					referencedInstructionIds: [],
				},
			],
			note: "[[カレー]]のメモ",
			linkViews: [
				{ label: "ソース", target: { publicId: "sauce", name: "特製ソース" } },
				{ label: "カレー", target: { publicId: "curry", name: "特製カレー" } },
				{ label: "消えた", target: null },
			],
		};

		render(<RecipeView recipe={withLinks} onOpenLink={onOpenLink} />);

		expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
			"特製ソース",
			"特製カレー",
			"特製カレー",
		]);
		expect(screen.getByText("（見つからないレシピ）")).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: "特製ソース" }));

		expect(onOpenLink).toHaveBeenCalledWith("sauce", expect.anything());
	});

	describe("材料のリンク先を、その場で開く", () => {
		function linkRecipe(
			publicId: string,
			name: string,
			ingredientNames: string[],
		): RecipeDetail {
			return {
				...recipe,
				publicId,
				name,
				note: "",
				sourceUrl: null,
				preparations: [],
				instructions: [],
				ingredients: ingredientNames.map((ingredientName, index) => ({
					type: "ingredient" as const,
					status: "missing-amount" as const,
					id: `${publicId}-${index}`,
					name: ingredientName,
					rawText: ingredientName,
					amountText: null,
					quantity: null,
					unitLabel: null,
				})),
				linkViews: ingredientNames.flatMap((ingredientName) => {
					const label = ingredientName.replace(/^\[\[|\]\]$/gu, "");

					return ingredientName.startsWith("[[")
						? [{ label, target: { publicId: label, name: label } }]
						: [];
				}),
			};
		}

		const root = linkRecipe("root", "どんぶり", ["[[a]]"]);
		const linked = {
			a: linkRecipe("a", "A", ["醤油", "[[b]]"]),
			b: linkRecipe("b", "B", ["酢", "[[c]]"]),
			c: linkRecipe("c", "C", ["塩", "[[root]]"]),
		};

		it("2段目まで最初から開き、3段目からは閉じていて、押すと開く。輪になるリンクは「上で表示済み」", async () => {
			const user = userEvent.setup();

			render(<RecipeView recipe={root} linkedRecipes={linked} />);

			// 1段目（A）・2段目（B）は開いている
			expect(screen.getByText("醤油")).toBeVisible();
			expect(screen.getByText("酢")).toBeVisible();
			// 3段目（C）は閉じている
			expect(screen.queryByText("塩")).toBeNull();

			await user.click(screen.getByRole("button", { name: "Cの材料を開く" }));

			expect(screen.getByText("塩")).toBeVisible();
			// C の中の、元のレシピへのリンクは、もう一度開かない
			expect(screen.getByText("（上で表示済み）")).toBeVisible();

			await user.click(screen.getByRole("button", { name: "Aの材料を閉じる" }));

			expect(screen.queryByText("醤油")).toBeNull();
		});
	});
});
