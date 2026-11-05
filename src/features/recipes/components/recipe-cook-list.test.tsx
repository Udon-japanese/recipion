import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeCookEntry } from "../domain/recipe-cook-log";
import { RecipeCookList } from "./recipe-cook-list";

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

function entry(
	id: string,
	cookedAt: string,
	overrides: Partial<RecipeCookEntry> = {},
): RecipeCookEntry {
	return {
		id,
		cookedAt,
		recipeName: `レシピ${id}`,
		publicId: `pub-${id}`,
		cover: null,
		yieldText: "2人分",
		author: null,
		...overrides,
	};
}

describe("RecipeCookList", () => {
	it("日付ごとに見出しを付けて並べ、開けないレシピはリンクにしない", () => {
		render(
			<RecipeCookList
				initialPage={{
					entries: [
						entry("1", "2026-11-05T10:00:00.000Z", {
							author: {
								name: "れしぴょなー",
								handle: "user-abc",
								avatar: {
									background: "mint",
									placements: [{ partId: "tomato", x: 50, y: 50 }],
								},
							},
						}),
						entry("2", "2026-11-05T01:00:00.000Z", {
							publicId: null,
						}),
						entry("3", "2026-11-03T10:00:00.000Z"),
					],
					nextCursor: null,
				}}
				loadMore={vi.fn()}
			/>,
		);

		const today = screen.getByRole("region", { name: "2026年11月5日（木）" });

		expect(
			within(today).getByRole("link", { name: "レシピ1" }),
		).toHaveAttribute("href", "/recipes/pub-1");
		// 他の人のレシピは、何人分と作者を出す（自分のレシピの一覧・みんなのレシピと同じ行）。
		expect(today).toHaveTextContent("2人分");
		expect(today).toHaveTextContent("れしぴょなー（@user-abc）");
		expect(within(today).getByText("レシピ2")).toBeInTheDocument();
		expect(
			within(today).getByText("削除された（または見られなくなった）レシピ"),
		).toBeInTheDocument();
		expect(within(today).queryByRole("link", { name: "レシピ2" })).toBeNull();
		expect(
			screen.getByRole("region", { name: "2026年11月3日（火）" }),
		).toHaveTextContent("レシピ3");
		expect(screen.queryByRole("button", { name: "もっと見る" })).toBeNull();
	});

	it("もっと見るで続きを足し、同じ記録は二重に出さない", async () => {
		const user = userEvent.setup();
		const loadMore = vi.fn(async () => ({
			entries: [
				entry("2", "2026-11-04T10:00:00.000Z"),
				entry("3", "2026-11-03T10:00:00.000Z"),
			],
			nextCursor: null,
		}));

		render(
			<RecipeCookList
				initialPage={{
					entries: [
						entry("1", "2026-11-05T10:00:00.000Z"),
						entry("2", "2026-11-04T10:00:00.000Z"),
					],
					nextCursor: "next",
				}}
				loadMore={loadMore}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "もっと見る" }));

		expect(await screen.findByText("レシピ3")).toBeInTheDocument();
		expect(loadMore).toHaveBeenCalledWith("next");
		expect(screen.getAllByText("レシピ2")).toHaveLength(1);
		expect(screen.queryByRole("button", { name: "もっと見る" })).toBeNull();
	});

	it("記録がなければ、つくった！の案内を出す", () => {
		render(
			<RecipeCookList
				initialPage={{ entries: [], nextCursor: null }}
				loadMore={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("レシピの「つくった！」を押すと、ここに並びます。"),
		).toBeInTheDocument();
	});
});
