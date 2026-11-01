import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../../styles.css";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeView } from "./recipe-view";

const recipe: RecipeDetail = {
	publicId: "abc123",
	name: "ケークサレ(鮭チーズ)",
	servings: 2,
	note: "",
	sourceUrl: null,
	links: [],
	linkViews: [],
	ingredients: [],
	preparations: [],
	instructions: [],
};

async function renderHeader(width: number) {
	await page.viewport(width, 800);
	const { container } = await render(
		<RecipeView
			recipe={recipe}
			badges={<span>非公開</span>}
			actions={<button type="button">編集</button>}
		/>,
	);

	// article の中の header は、banner の役割を持たないので、要素で取る。
	const header = container.querySelector("header");

	if (!header) {
		throw new Error("見出しの欄がありません");
	}

	const title = page.getByRole("heading", { name: recipe.name }).element();
	const actions = page.getByRole("button", { name: "編集" }).element();

	return {
		header: header.getBoundingClientRect(),
		title: title.getBoundingClientRect(),
		actions: actions.getBoundingClientRect(),
	};
}

// 狭い幅では、操作（編集・…）を絵の横に、題名を、その下の幅いっぱいに置く（題名が細く折れないように）。
it.each([375, 360])(
	"%i px の幅で、題名は操作の下に、幅いっぱいに置く",
	async (width) => {
		const { header, title, actions } = await renderHeader(width);

		expect(title.top).toBeGreaterThanOrEqual(actions.bottom);
		expect(title.left).toBe(header.left);
	},
);

it("広い幅では、題名と操作を横に並べる", async () => {
	const { title, actions } = await renderHeader(1280);

	expect(title.top).toBeLessThan(actions.bottom);
	expect(actions.left).toBeGreaterThan(title.left);
});
