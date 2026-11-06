import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeRecipeSnapshots } from "../domain/merge-recipe-snapshot";
import type { RecipeSnapshot } from "../domain/recipe-snapshot";
import { RecipeParentMerge } from "./recipe-parent-merge";

afterEach(cleanup);

function snapshot(overrides: Partial<RecipeSnapshot>): RecipeSnapshot {
	return {
		yieldText: "1台",
		ingredients: "薄力粉 100g\n牛乳 100ml\n塩 少々",
		preparations: "",
		instructions: "1. 混ぜる\n2. 焼く",
		note: "",
		...overrides,
	};
}

// 親は牛乳を120mlに、作り方を180℃に。子は牛乳を豆乳にし、メモを書いた。
const merges = mergeRecipeSnapshots({
	base: snapshot({}),
	parent: snapshot({
		ingredients: "薄力粉 100g\n牛乳 120ml\n塩 少々",
		instructions: "1. 混ぜる\n2. 180℃で焼く",
	}),
	mine: snapshot({
		ingredients: "薄力粉 100g\n豆乳 100ml\n塩 少々",
		note: "甘さ控えめ",
	}),
});

function setup() {
	const onOpenEditor = vi.fn();
	const onDismiss = vi.fn(async () => {});

	render(
		<RecipeParentMerge
			parentName="ケークサレ"
			parentAuthorName="たろう"
			merges={merges}
			onOpenEditor={onOpenEditor}
			onDismiss={onDismiss}
			onCancel={vi.fn()}
		/>,
	);

	return { onOpenEditor, onDismiss };
}

describe("RecipeParentMerge", () => {
	it("親の変更は、印を付けて見せ、ぶつかったところを選ぶまで、エディタで開けない", async () => {
		const user = userEvent.setup();
		const { onOpenEditor } = setup();

		expect(
			screen.getByText(/両方で変わったところが1か所あります/u),
		).toBeInTheDocument();
		expect(screen.getByText("2. 180℃で焼く")).toBeInTheDocument();
		expect(screen.getAllByText("もとのレシピの変更").length).toBeGreaterThan(0);

		const open = screen.getByRole("button", { name: "エディタで開く" });

		expect(open).toBeDisabled();

		await user.click(
			screen.getByRole("radio", { name: "このレシピの行のままにする" }),
		);
		await user.click(open);

		expect(onOpenEditor).toHaveBeenCalledWith({
			ingredients: "薄力粉 100g\n豆乳 100ml\n塩 少々",
			instructions: "1. 混ぜる\n2. 180℃で焼く",
		});
	});

	it("親がまた変わって比べ直したときは、その知らせを上に出す", () => {
		render(
			<RecipeParentMerge
				parentName="ケークサレ"
				parentAuthorName={null}
				merges={merges}
				onOpenEditor={vi.fn()}
				onDismiss={vi.fn(async () => {})}
				onCancel={vi.fn()}
				notice="もとのレシピが、また変わりました。最新の内容で、比べ直しました。"
			/>,
		);

		expect(
			screen.getByText(
				"もとのレシピが、また変わりました。最新の内容で、比べ直しました。",
			),
		).toBeInTheDocument();
	});

	it("「今回の変更は取り込まない」を選べる", async () => {
		const user = userEvent.setup();
		const { onDismiss } = setup();

		await user.click(
			screen.getByRole("button", { name: "今回の変更は取り込まない" }),
		);

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});
