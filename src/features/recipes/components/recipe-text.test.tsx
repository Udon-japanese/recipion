import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeLinkView } from "../domain/recipe-links";
import { RecipeText } from "./recipe-text";

afterEach(cleanup);

const linkViews: RecipeLinkView[] = [
	{ label: "カレー", target: { publicId: "curry-id", name: "特製カレー" } },
	{ label: "消えたレシピ", target: null },
];

describe("RecipeText", () => {
	it("リンク先が見つかるときは、リンク先の現在の名前を、押せるボタンで出す", async () => {
		const onOpenLink = vi.fn();

		const { container } = render(
			<p>
				<RecipeText
					text="1. [[カレー]]をかける"
					linkViews={linkViews}
					onOpenLink={onOpenLink}
				/>
			</p>,
		);

		// ラベルではなく、リンク先の名前を出す。
		const button = screen.getByRole("button", { name: "特製カレー" });

		await userEvent.click(button);

		expect(onOpenLink).toHaveBeenCalledWith("curry-id", button);
		expect(container.textContent).toBe("1. 特製カレーをかける");
	});

	it("リンク先が削除された・見られないときは、「（見つからないレシピ）」と出す", () => {
		render(
			<p>
				<RecipeText
					text="[[消えたレシピ]]を参照"
					linkViews={linkViews}
					onOpenLink={vi.fn()}
				/>
			</p>,
		);

		expect(screen.getByText("（見つからないレシピ）")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("リンク先を決めていないラベルは、括弧なしの、ふつうの文字で出す", () => {
		render(
			<p>
				<RecipeText
					text="[[決めていない]]を使う"
					linkViews={linkViews}
					onOpenLink={vi.fn()}
				/>
			</p>,
		);

		expect(screen.getByText("決めていない")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByText(/\[\[/u)).toBeNull();
	});

	it("onOpenLink がなければ、リンク先の名前を、押せない文字で出す", () => {
		render(
			<p>
				<RecipeText text="[[カレー]]" linkViews={linkViews} />
			</p>,
		);

		expect(screen.getByText("特製カレー")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("リンクのない文章は、そのまま出す", () => {
		const { container } = render(
			<p>
				<RecipeText text="混ぜる" linkViews={[]} />
			</p>,
		);

		expect(container.textContent).toBe("混ぜる");
	});
});
