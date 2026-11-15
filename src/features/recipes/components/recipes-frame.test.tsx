import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeMadeFrame, RecipesFrame } from "./recipes-frame";

// リンクは、ルーターの外では、描画できないため、差し替える。
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		to: string;
		"aria-label"?: string;
	}) => (
		<a href={to} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("#/components/button/button-link", () => ({
	ButtonLink: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

afterEach(cleanup);

describe("RecipesFrame", () => {
	it("切り替えは、自分のレシピとみんなのレシピの2つで、押すと切り替え先を知らせる", async () => {
		const user = userEvent.setup();
		const onTabChange = vi.fn();

		render(
			<RecipesFrame
				tab="mine"
				onTabChange={onTabChange}
				carryState={(prev) => prev}
			>
				<p>中身</p>
			</RecipesFrame>,
		);

		const group = screen.getByRole("group", { name: "表示するレシピ" });

		expect(
			within(group)
				.getAllByRole("button")
				.map((button) => button.textContent),
		).toEqual(["自分のレシピ", "みんなのレシピ"]);

		await user.click(
			within(group).getByRole("button", { name: "みんなのレシピ" }),
		);

		expect(onTabChange).toHaveBeenCalledWith("public");
		expect(screen.getByText("中身")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "つくった記録" })).toHaveAttribute(
			"href",
			"/recipes/made",
		);
	});
});

describe("RecipeMadeFrame", () => {
	it("つくった記録は、切り替えを出さず、題名と、レシピへ戻るリンクつきの別の画面にする", () => {
		render(
			<RecipeMadeFrame>
				<p>記録の一覧</p>
			</RecipeMadeFrame>,
		);

		expect(
			screen.getByRole("heading", { name: "つくった記録" }),
		).toBeInTheDocument();
		expect(screen.getByText("記録の一覧")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "レシピ" })).toHaveAttribute(
			"href",
			"/recipes",
		);
		expect(screen.queryByRole("group", { name: "表示するレシピ" })).toBeNull();
	});
});
