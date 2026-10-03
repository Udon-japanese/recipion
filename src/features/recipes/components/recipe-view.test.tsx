import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeView } from "./recipe-view";

afterEach(cleanup);

const recipe: RecipeDetail = {
	publicId: "abc123",
	name: "つくね",
	servings: 2,
	note: "人数を変えるときはたれを調整する",
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
});
