import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeLinkPicker } from "./recipe-link-picker";

afterEach(cleanup);

const targets = [
	{ publicId: "a", name: "トマトカレー" },
	{ publicId: "b", name: "ハンバーグ" },
];

function setup(
	status: "loading" | "ready" | "error" = "ready",
	list = targets,
) {
	const onSelect = vi.fn();
	const onClose = vi.fn();

	render(
		<RecipeLinkPicker
			title="リンクするレシピを選ぶ"
			targets={list}
			status={status}
			onSelect={onSelect}
			onClose={onClose}
		/>,
	);

	return { onSelect, onClose, user: userEvent.setup() };
}

describe("RecipeLinkPicker", () => {
	it("レシピを一覧から選べる", async () => {
		const { onSelect, user } = setup();

		await user.click(screen.getByRole("button", { name: "ハンバーグ" }));

		expect(onSelect).toHaveBeenCalledWith(targets[1]);
	});

	it("名前で絞れる（ひらがなでも）", async () => {
		const { user } = setup();

		await user.type(
			screen.getByRole("textbox", { name: "レシピを探す" }),
			"とまと",
		);

		expect(screen.getByRole("button", { name: "トマトカレー" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "ハンバーグ" })).toBeNull();
	});

	it("一致がなければ、見つからない旨を出す", async () => {
		const { user } = setup();

		await user.type(
			screen.getByRole("textbox", { name: "レシピを探す" }),
			"ラーメン",
		);

		expect(screen.getByText("見つかりません。")).toBeTruthy();
	});

	it("Escape と「閉じる」で、閉じる。Enter は、何もしない（フォームが送信されない）", async () => {
		const { onClose, user } = setup();

		await user.click(screen.getByRole("textbox", { name: "レシピを探す" }));
		await user.keyboard("{Enter}");

		expect(onClose).not.toHaveBeenCalled();

		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "閉じる" }));

		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it("読み込み中・失敗・リンクできるレシピがないときの文を出す", () => {
		const { unmount } = render(
			<RecipeLinkPicker
				title="t"
				targets={[]}
				status="loading"
				onSelect={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText("読み込んでいます…")).toBeTruthy();
		unmount();

		const error = render(
			<RecipeLinkPicker
				title="t"
				targets={[]}
				status="error"
				onSelect={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("alert").textContent).toContain(
			"読み込めませんでした",
		);
		error.unmount();

		render(
			<RecipeLinkPicker
				title="t"
				targets={[]}
				status="ready"
				onSelect={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("リンクできるレシピが、まだありません。"),
		).toBeTruthy();
	});
});
