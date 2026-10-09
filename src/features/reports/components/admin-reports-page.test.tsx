import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenReport } from "../domain/report";
import { AdminReportsPage } from "./admin-reports-page";

afterEach(cleanup);

const reports: OpenReport[] = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		recipePublicId: "abc",
		recipeName: "つくね",
		recipeExists: true,
		ownerName: "れしぴょなー",
		ownerHandle: "user-abc",
		reason: "copyright",
		detail: "他のサイトと同じ文章です",
		createdAt: "2026-10-09T03:00:00.000Z",
	},
];

describe("AdminReportsPage", () => {
	it("通報の内容を表示し、非公開にすると、一覧から外れる", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn(async () => "done" as const);

		render(
			<AdminReportsPage
				reports={reports}
				loadRecipe={async () => null}
				onResolve={onResolve}
			/>,
		);

		expect(screen.getByText("つくね")).toBeInTheDocument();
		expect(screen.getByText(/権利を侵害している/u)).toBeInTheDocument();
		expect(screen.getByText(/@user-abc/u)).toBeInTheDocument();
		expect(screen.getByText("他のサイトと同じ文章です")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "非公開にする" }));

		expect(onResolve).toHaveBeenCalledWith(reports[0]?.id, "make-private");
		await waitFor(() =>
			expect(
				screen.getByText("未対応の通報は、ありません。"),
			).toBeInTheDocument(),
		);
	});

	it("削除は、確認の2段階。「やめる」で戻れる", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn(async () => "done" as const);

		render(
			<AdminReportsPage
				reports={reports}
				loadRecipe={async () => null}
				onResolve={onResolve}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "削除する" }));
		expect(onResolve).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "やめる" }));
		expect(
			screen.getByRole("button", { name: "削除する" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "削除する" }));
		await user.click(screen.getByRole("button", { name: "本当に削除する" }));

		expect(onResolve).toHaveBeenCalledWith(reports[0]?.id, "delete");
	});

	it("削除済みのレシピは、レシピを見る・非公開・削除を出さず、却下だけ", () => {
		render(
			<AdminReportsPage
				reports={[{ ...reports[0], recipeExists: false } as OpenReport]}
				loadRecipe={async () => null}
				onResolve={async () => "done"}
			/>,
		);

		expect(screen.getByText(/削除済み/u)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "非公開にする" })).toBeNull();
		expect(screen.queryByRole("button", { name: "削除する" })).toBeNull();
		expect(
			screen.getByRole("button", { name: "対応しない（却下）" }),
		).toBeInTheDocument();
	});
});
