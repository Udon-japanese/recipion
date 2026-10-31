import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminUserSummary } from "../domain/admin-user";
import { AdminUsersPage } from "./admin-users-page";

const normalUser: AdminUserSummary = {
	id: "u1",
	name: "太郎",
	handle: "taro",
	createdAt: "2026-09-01T00:00:00.000Z",
	publicRecipeCount: 3,
	violationCount: 2,
	reportedCount: 1,
	suspension: null,
};

const suspendedUser: AdminUserSummary = {
	...normalUser,
	id: "u2",
	name: "花子",
	handle: "hanako",
	suspension: {
		status: "suspended",
		reason: "繰り返したため",
		suspendedAt: "2026-10-10T00:00:00.000Z",
	},
};

function setup(users: AdminUserSummary[] = [normalUser]) {
	const onSearch = vi.fn();
	const onSuspend = vi.fn(async () => "done" as const);
	const onLift = vi.fn(async () => "done" as const);

	render(
		<AdminUsersPage
			users={users}
			query=""
			onSearch={onSearch}
			onSuspend={onSuspend}
			onLift={onLift}
		/>,
	);

	return { onSearch, onSuspend, onLift };
}

describe("AdminUsersPage", () => {
	it("ユーザーの要約を表示し、メールアドレスは出さない", () => {
		setup();

		expect(screen.getByText(/太郎（@taro）/u)).toBeInTheDocument();
		expect(
			screen.getByText(/公開のレシピ 3件・違反 2回・通報された 1件/u),
		).toBeInTheDocument();
		expect(screen.queryByText(/@example\.com/u)).toBeNull();
	});

	it("表示名・ハンドルで探す（前後の空白は除く）", async () => {
		const user = userEvent.setup();
		const { onSearch } = setup();

		await user.type(screen.getByLabelText("表示名・ハンドルで探す"), " taro ");
		await user.click(screen.getByRole("button", { name: "探す" }));

		expect(onSearch).toHaveBeenCalledWith("taro");
	});

	it("停止には理由が要る。理由を入れて停止すると、公開レシピの非公開が既定で付く", async () => {
		const user = userEvent.setup();
		const { onSuspend } = setup();

		await user.click(screen.getByRole("button", { name: "停止する…" }));

		expect(
			screen.getByLabelText(/公開のレシピをすべて非公開にする/u),
		).toBeChecked();

		await user.click(screen.getByRole("button", { name: "停止する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"停止の理由を入力してください",
		);
		expect(onSuspend).not.toHaveBeenCalled();

		await user.type(screen.getByLabelText("太郎の停止の理由"), "いやがらせ");
		await user.click(screen.getByRole("button", { name: "停止する" }));

		expect(onSuspend).toHaveBeenCalledWith({
			userId: "u1",
			reason: "いやがらせ",
			ban: false,
			makePrivate: true,
		});
		expect(await screen.findByText("停止しました")).toBeInTheDocument();
	});

	it("非公開にしない選択もできる。永久停止は、確認の2段階", async () => {
		const user = userEvent.setup();
		const { onSuspend } = setup();

		await user.click(screen.getByRole("button", { name: "停止する…" }));
		await user.type(screen.getByLabelText("太郎の停止の理由"), "悪質");
		await user.click(
			screen.getByLabelText(/公開のレシピをすべて非公開にする/u),
		);
		await user.click(screen.getByRole("button", { name: "永久停止にする" }));

		expect(onSuspend).not.toHaveBeenCalled();

		await user.click(
			screen.getByRole("button", { name: "本当に永久停止にする" }),
		);

		expect(onSuspend).toHaveBeenCalledWith({
			userId: "u1",
			reason: "悪質",
			ban: true,
			makePrivate: false,
		});
		expect(await screen.findByText("永久停止にしました")).toBeInTheDocument();
	});

	it("管理者のアカウントは停止できないと表示する", async () => {
		const user = userEvent.setup();
		const onSuspend = vi.fn(async () => "protected" as const);

		render(
			<AdminUsersPage
				users={[normalUser]}
				query=""
				onSearch={vi.fn()}
				onSuspend={onSuspend}
				onLift={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "停止する…" }));
		await user.type(screen.getByLabelText("太郎の停止の理由"), "x");
		await user.click(screen.getByRole("button", { name: "停止する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"管理者のアカウントは停止できません",
		);
	});

	it("停止中のユーザーは、停止の理由を表示し、確認のあとで解除できる", async () => {
		const user = userEvent.setup();
		const { onLift } = setup([suspendedUser]);

		expect(screen.getByText("停止中")).toBeInTheDocument();
		expect(screen.getByText(/停止の理由：繰り返したため/u)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "停止する…" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "停止を解除する" }));

		expect(onLift).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "本当に解除する" }));

		await waitFor(() => expect(onLift).toHaveBeenCalledWith("u2"));
		expect(await screen.findByText("停止を解除しました")).toBeInTheDocument();
	});

	it("永久停止中は、「永久停止を解除する」と表示する", () => {
		setup([
			{
				...suspendedUser,
				suspension: {
					status: "banned",
					reason: "悪質",
					suspendedAt: "2026-10-10T00:00:00.000Z",
				},
			},
		]);

		expect(screen.getByText("永久停止中")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "永久停止を解除する" }),
		).toBeInTheDocument();
	});

	it("操作に失敗したら、エラーを表示する", async () => {
		const user = userEvent.setup();

		render(
			<AdminUsersPage
				users={[normalUser]}
				query=""
				onSearch={vi.fn()}
				onSuspend={vi.fn().mockRejectedValue(new Error("offline"))}
				onLift={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "停止する…" }));
		await user.type(screen.getByLabelText("太郎の停止の理由"), "x");
		await user.click(screen.getByRole("button", { name: "停止する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"停止できませんでした",
		);
	});
});
