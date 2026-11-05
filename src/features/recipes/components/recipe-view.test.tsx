import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeView } from "./recipe-view";

afterEach(cleanup);

const recipe: RecipeDetail = {
	publicId: "abc123",
	name: "つくね",
	yieldText: "2人分",
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
		const group = screen.getByText("たれ").closest("section");
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

	it("人数は「材料」の見出しの横に出し、グループに入っていない材料は枠の外に出す", () => {
		render(<RecipeView recipe={recipe} />);

		const heading = screen.getByRole("heading", { name: "材料" });
		expect(heading.parentElement).toHaveTextContent("材料2人分");
		expect(screen.getByText("2人分").closest("header")).toBeNull();

		const group = screen.getByText("たれ").closest("section") as HTMLElement;
		expect(within(group).queryByText("ベーコン")).toBeNull();
	});

	it("作り方・メモがあるときは、材料と作り方を切り替えるタブを出す", () => {
		const { unmount } = render(<RecipeView recipe={recipe} />);

		expect(screen.getByRole("button", { name: "そろえる" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "作りかた" })).toBeTruthy();

		unmount();
		render(
			<RecipeView
				recipe={{ ...recipe, instructions: [], note: "", sourceUrl: null }}
			/>,
		);

		expect(screen.queryByRole("button", { name: "作りかた" })).toBeNull();
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

	it("材料がなければ、材料の見出しも人数も出さない。中身が何もなければ、その旨を1つだけ出す", () => {
		const { unmount } = render(
			<RecipeView recipe={{ ...recipe, ingredients: [] }} />,
		);

		expect(screen.queryByRole("heading", { name: "材料" })).toBeNull();
		expect(screen.queryByText("2人分")).toBeNull();
		// 下準備はあるので、出す
		expect(screen.getByRole("heading", { name: "下準備" })).toBeTruthy();

		unmount();
		render(
			<RecipeView
				recipe={{
					...recipe,
					ingredients: [],
					preparations: [],
					instructions: [],
					note: "",
					sourceUrl: null,
				}}
			/>,
		);

		expect(screen.getByText("まだ中身がありません。")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "そろえる" })).toBeNull();
	});

	it("作り方の見出しの右に、渡したもの（画面をつけたまま）を出す。作り方がなければ出さない", () => {
		const { unmount } = render(
			<RecipeView
				recipe={recipe}
				instructionsAction={<span>つけたまま</span>}
			/>,
		);

		// 見出しの行（見出し・添え書きのまとまりと、右の操作）。
		const headingRow = screen.getByRole("heading", { name: "作り方" })
			.parentElement?.parentElement as HTMLElement;
		expect(within(headingRow).getByText("つけたまま")).toBeTruthy();

		unmount();
		render(
			<RecipeView
				recipe={{ ...recipe, instructions: [] }}
				instructionsAction={<span>つけたまま</span>}
			/>,
		);

		expect(screen.queryByText("つけたまま")).toBeNull();
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

		// 切り替えのタブ（そろえる・作りかた）は、リンクではない
		expect(
			screen
				.getAllByRole("button")
				.map((b) => b.textContent)
				.filter((text) => text !== "そろえる" && text !== "作りかた"),
		).toEqual(["特製ソース", "特製カレー", "特製カレー"]);
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

		it("2段目まで最初から開き、3段目からは閉じていて、行を押すと開く。輪になるリンクは「上で表示済み」", async () => {
			const user = userEvent.setup();

			render(<RecipeView recipe={root} linkedRecipes={linked} />);

			expect(screen.getByRole("button", { name: "Aの材料" })).toHaveAttribute(
				"aria-expanded",
				"true",
			);

			// 1段目（A）・2段目（B）は開いている
			expect(screen.getByText("醤油")).toBeVisible();
			expect(screen.getByText("酢")).toBeVisible();
			// 3段目（C）は閉じている
			expect(screen.queryByText("塩")).toBeNull();

			await user.click(screen.getByRole("button", { name: "Cの材料" }));

			expect(screen.getByText("塩")).toBeVisible();
			// C の中の、元のレシピへのリンクは、もう一度開かない
			expect(screen.getByText("（上で表示済み）")).toBeVisible();

			await user.click(screen.getByRole("button", { name: "Aの材料" }));

			expect(screen.queryByText("醤油")).toBeNull();
		});

		it("開いた箱の中から、リンク先のプレビューを開ける", async () => {
			const user = userEvent.setup();
			const onOpenLink = vi.fn();

			render(
				<RecipeView
					recipe={root}
					linkedRecipes={linked}
					onOpenLink={onOpenLink}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Aのレシピを見る" }));

			expect(onOpenLink).toHaveBeenCalledWith("a", expect.anything(), 1);
		});
	});
});

describe("RecipeView：材料のチェックリスト", () => {
	// グループに2つの材料（全部チェックの確認用）。
	const withGroup: RecipeDetail = {
		...recipe,
		ingredients: [
			...recipe.ingredients.slice(0, 1),
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
						rawText: "しょうゆ 大さじ1",
						amountText: "大さじ1",
						quantity: 1,
						unitLabel: "大さじ",
					},
					{
						type: "ingredient",
						status: "parsed",
						id: "i3",
						name: "みりん",
						rawText: "みりん 大さじ1",
						amountText: "大さじ1",
						quantity: 1,
						unitLabel: "大さじ",
					},
				],
			},
		],
	};

	it("初めは、ふつうの表示（チェックボックスを出さない）。詳細の画面でなければ、切り替えも出さない", () => {
		const { unmount } = render(<RecipeView recipe={withGroup} checklist />);

		expect(
			screen.getByRole("switch", { name: "チェックリストで見る" }),
		).not.toBeChecked();
		expect(screen.queryByRole("checkbox")).toBeNull();

		unmount();
		render(<RecipeView recipe={withGroup} />);

		expect(
			screen.queryByRole("switch", { name: "チェックリストで見る" }),
		).toBeNull();
	});

	it("切り替えると、材料ごとにチェックできる。グループ外の材料にも出す", async () => {
		const user = userEvent.setup();

		render(<RecipeView recipe={withGroup} checklist />);

		await user.click(
			screen.getByRole("switch", { name: "チェックリストで見る" }),
		);
		await user.click(
			screen.getByRole("checkbox", { name: "ベーコンをチェック" }),
		);

		expect(
			screen.getByRole("checkbox", { name: "ベーコンをチェック" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "しょうゆをチェック" }),
		).not.toBeChecked();
	});

	it("グループの「全部チェック」で、グループの中だけをまとめてチェックし、「全部外す」で外す", async () => {
		const user = userEvent.setup();

		render(<RecipeView recipe={withGroup} checklist />);

		await user.click(
			screen.getByRole("switch", { name: "チェックリストで見る" }),
		);
		await user.click(
			screen.getByRole("button", { name: "たれを全部チェック" }),
		);

		expect(
			screen.getByRole("checkbox", { name: "しょうゆをチェック" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "みりんをチェック" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "ベーコンをチェック" }),
		).not.toBeChecked();

		await user.click(screen.getByRole("button", { name: "たれを全部外す" }));

		expect(
			screen.getByRole("checkbox", { name: "しょうゆをチェック" }),
		).not.toBeChecked();
	});

	it("ふつうの表示に戻しても、もう一度チェックリストにすれば、チェックは残っている（画面を開いている間）", async () => {
		const user = userEvent.setup();

		render(<RecipeView recipe={withGroup} checklist />);

		const toggle = screen.getByRole("switch", { name: "チェックリストで見る" });

		await user.click(toggle);
		await user.click(
			screen.getByRole("checkbox", { name: "みりんをチェック" }),
		);
		await user.click(toggle);

		expect(screen.queryByRole("checkbox")).toBeNull();

		await user.click(toggle);

		expect(
			screen.getByRole("checkbox", { name: "みりんをチェック" }),
		).toBeChecked();
	});

	describe("人数を変えて見る（ratio）", () => {
		function amountItem(
			id: string,
			name: string,
			amountText: string,
			quantity: number,
			unitLabel: string,
		) {
			return {
				type: "ingredient" as const,
				status: "parsed" as const,
				id,
				name,
				rawText: `${name} ${amountText}`,
				amountText,
				quantity,
				unitLabel,
			};
		}

		it("材料の分量と、見出しのできあがりの量に、割合を掛ける（範囲は、下限と上限に）", () => {
			render(<RecipeView recipe={recipe} ratio={2} />);

			expect(screen.getByText("4人分")).toBeInTheDocument();
			expect(screen.getByText("大さじ3")).toBeInTheDocument();
			expect(screen.getByText("120~140g")).toBeInTheDocument();
		});

		it("その場で開くリンク先の分量は、このレシピの割合 × リンクの行の割合", () => {
			const dough: RecipeDetail = {
				...recipe,
				publicId: "dough",
				name: "生地",
				yieldText: "2人分",
				note: "",
				sourceUrl: null,
				preparations: [],
				instructions: [],
				ingredients: [amountItem("d1", "薄力粉", "100g", 100, "g")],
			};
			const root: RecipeDetail = {
				...recipe,
				ingredients: [amountItem("r1", "[[生地]]", "1/2量", 0.5, "量")],
				linkViews: [
					{ label: "生地", target: { publicId: "dough", name: "生地" } },
				],
			};

			const { unmount } = render(
				<RecipeView recipe={root} linkedRecipes={{ dough }} />,
			);

			expect(screen.getByText("50g")).toBeInTheDocument();
			unmount();

			render(<RecipeView recipe={root} linkedRecipes={{ dough }} ratio={2} />);

			expect(screen.getByText("100g")).toBeInTheDocument();
			expect(screen.getByText("1量")).toBeInTheDocument();
		});
	});
});
