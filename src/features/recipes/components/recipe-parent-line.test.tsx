import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	RecipeParentChangeNotice,
	RecipeParentLine,
} from "./recipe-parent-line";

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

describe("RecipeParentLine", () => {
	it.each([
		{
			title: "他の人のレシピ",
			parent: {
				status: "visible" as const,
				publicId: "p1",
				name: "ケークサレ",
				authorName: "たろう",
				changedSections: [],
			},
			text: "たろうさんの『ケークサレ』をもとに",
		},
		{
			title: "自分のレシピ",
			parent: {
				status: "visible" as const,
				publicId: "p1",
				name: "ケークサレ",
				authorName: null,
				changedSections: [],
			},
			text: "『ケークサレ』をもとに",
		},
		{
			title: "見つからない親（見られない・もうない、を区別しない）",
			parent: { status: "missing" as const },
			text: "（見つからないレシピ）をもとに",
		},
	])("$title：$text", ({ parent, text }) => {
		render(<RecipeParentLine parent={parent} />);

		expect(
			screen.getByText(
				(_, element) =>
					element?.tagName === "P" && element.textContent === text,
			),
		).toBeInTheDocument();
	});

	it("親へのリンクを出す", () => {
		render(
			<RecipeParentLine
				parent={{
					status: "visible",
					publicId: "p1",
					name: "ケークサレ",
					authorName: null,
					changedSections: [],
				}}
			/>,
		);

		expect(
			screen.getByRole("link", { name: "『ケークサレ』" }),
		).toHaveAttribute("href", "/recipes/p1");
	});
});

describe("RecipeParentChangeNotice", () => {
	const visible = {
		status: "visible" as const,
		publicId: "p1",
		name: "ケークサレ",
		authorName: null,
	};

	it("親が変わっていれば、変わった部分と操作を出す", () => {
		render(
			<RecipeParentChangeNotice
				parent={{
					...visible,
					changedSections: ["ingredients", "instructions"],
				}}
				action={<button type="button">違いを見る</button>}
			/>,
		);

		expect(
			screen.getByText("もとのレシピの材料・作り方が変わりました"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "違いを見る" }),
		).toBeInTheDocument();
	});

	it.each([
		{ ...visible, changedSections: [] },
		{ status: "missing" as const },
	])("変わっていない・見つからないときは、出さない（%j）", (parent) => {
		const { container } = render(
			<RecipeParentChangeNotice
				parent={parent}
				action={<button type="button">違いを見る</button>}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
