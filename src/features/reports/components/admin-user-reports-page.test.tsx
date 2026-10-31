import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OpenUserNameReport } from "../domain/user-report";
import { AdminUserReportsPage } from "./admin-user-reports-page";

const report: OpenUserNameReport = {
	id: "11111111-1111-4111-8111-111111111111",
	reportedName: "不適切な名前",
	reportedHandle: "bad-name",
	currentName: "不適切な名前",
	currentHandle: "bad-name",
	reason: "inappropriate",
	detail: "ひどい名前です",
	createdAt: "2026-10-09T03:00:00.000Z",
};

describe("AdminUserReportsPage", () => {
	it("通報の内容を表示し、停止のためのリンクを出す", () => {
		render(<AdminUserReportsPage reports={[report]} onResolve={vi.fn()} />);

		expect(screen.getByText("不適切な名前（@bad-name）")).toBeInTheDocument();
		expect(screen.getByText(/不適切な名前・/u)).toBeInTheDocument();
		expect(screen.getByText("ひどい名前です")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /停止する/u })).toHaveAttribute(
			"href",
			"/admin/users?q=bad-name",
		);
	});

	it("名前を戻すのは、確認の2段階。戻すと一覧から外れる", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn(async () => "done" as const);

		render(<AdminUserReportsPage reports={[report]} onResolve={onResolve} />);

		await user.click(
			screen.getByRole("button", { name: "名前を初期値に戻す" }),
		);

		expect(onResolve).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "本当に戻す" }));

		expect(onResolve).toHaveBeenCalledWith(report.id, "reset-name");
		expect(
			await screen.findByText("未対応のユーザー名の通報はありません。"),
		).toBeInTheDocument();
	});

	it("却下できる", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn(async () => "done" as const);

		render(<AdminUserReportsPage reports={[report]} onResolve={onResolve} />);
		await user.click(
			screen.getByRole("button", { name: "対応しない（却下）" }),
		);

		expect(onResolve).toHaveBeenCalledWith(report.id, "dismiss");
	});

	it("退会したユーザーの通報は、名前の控えが消えていて、退会済みと表示する", () => {
		render(
			<AdminUserReportsPage
				reports={[
					{
						...report,
						reportedName: "",
						reportedHandle: "",
						currentName: null,
						currentHandle: null,
					},
				]}
				onResolve={vi.fn()}
			/>,
		);

		expect(screen.getByText("（退会済みのユーザー）")).toBeInTheDocument();
	});

	it("通報のあとで名前が変わっていれば、いまの名前を添える。退会済みなら、その旨を出して、名前は戻せない", () => {
		render(
			<AdminUserReportsPage
				reports={[
					{ ...report, currentName: "直した名前", currentHandle: "fixed" },
					{
						...report,
						id: "22222222-2222-4222-8222-222222222222",
						currentName: null,
						currentHandle: null,
					},
				]}
				onResolve={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("いまの名前：直した名前（@fixed）"),
		).toBeInTheDocument();
		expect(
			screen.getByText("このユーザーはすでに退会しています。"),
		).toBeInTheDocument();
		// 退会済みの通報には、名前を戻すボタンがない（1件目だけ）
		expect(
			screen.getAllByRole("button", { name: "名前を初期値に戻す" }),
		).toHaveLength(1);
	});

	it("対応に失敗したら、エラーを出し、一覧に残す", async () => {
		const user = userEvent.setup();

		render(
			<AdminUserReportsPage
				reports={[report]}
				onResolve={vi.fn().mockRejectedValue(new Error("x"))}
			/>,
		);
		await user.click(
			screen.getByRole("button", { name: "対応しない（却下）" }),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"対応できませんでした",
		);
		expect(screen.getByText("不適切な名前（@bad-name）")).toBeInTheDocument();
	});

	it("対応済みの履歴を、対応の内容つきで表示する", async () => {
		const user = userEvent.setup();

		render(
			<AdminUserReportsPage
				reports={[]}
				resolved={[
					{
						...report,
						resolution: "name-reset",
						resolvedAt: "2026-10-10T00:00:00.000Z",
					},
				]}
				onResolve={vi.fn()}
			/>,
		);

		await user.click(screen.getByText("対応済みのユーザー名の通報（1件）"));

		expect(screen.getByText(/名前を初期値に戻した/u)).toBeInTheDocument();
	});
});
