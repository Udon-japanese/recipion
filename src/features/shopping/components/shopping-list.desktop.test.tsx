import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import { ShoppingList } from "./shopping-list";

// PC の幅（768px 以上）の画面として動かす。
beforeEach(() => {
	vi.stubGlobal(
		"matchMedia",
		(query: string) =>
			({
				matches: query.includes("min-width: 768px"),
				media: query,
				addEventListener: () => undefined,
				removeEventListener: () => undefined,
			}) as unknown as MediaQueryList,
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ShoppingList（PC の幅）", () => {
	it("追加のボタンは、画面の隅の丸いボタンではなく、右上の文字つきのボタンに出る", async () => {
		const user = userEvent.setup();

		render(<ShoppingList repository={createFakeShoppingRepository()} />);

		await screen.findByText("買うものはまだありません。");

		// 画面の隅の丸いボタンは、ない。
		expect(
			screen.queryByRole("button", { name: "買うものを入れる" }),
		).toBeNull();

		await user.click(screen.getByRole("button", { name: "追加" }));

		expect(
			await screen.findByRole("dialog", { name: "買うものを入れる" }),
		).toBeInTheDocument();
	});

	it("「ほかの入れ方」は、右上のボタンから開くメニューに、まとまっている", async () => {
		const user = userEvent.setup();

		render(<ShoppingList repository={createFakeShoppingRepository()} />);

		await screen.findByText("買うものはまだありません。");
		await user.click(screen.getByRole("button", { name: "ほかの入れ方" }));

		const menu = await screen.findByRole("menu");

		expect(
			within(menu).getByRole("menuitem", { name: "まとめて追加" }),
		).toBeInTheDocument();
		expect(
			within(menu).getByRole("menuitem", { name: "条件つきのメモを追加" }),
		).toBeInTheDocument();
	});
});
