import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "../application/profile-repository";
import type { UpdateProfileResult } from "../application/update-profile";
import { ProfileForm } from "./profile-form";

afterEach(cleanup);

const profile: Profile = { name: "れしぴょなー", handle: "user-8f3k2a1b" };

function setup(result: UpdateProfileResult = { ok: true }) {
	const onSave = vi.fn(async () => result);
	const onChanged = vi.fn();

	render(
		<ProfileForm profile={profile} onSave={onSave} onChanged={onChanged} />,
	);

	return { onSave, onChanged, user: userEvent.setup() };
}

describe("ProfileForm", () => {
	it("表示名とハンドルを直して、保存できる", async () => {
		const { onSave, onChanged, user } = setup();

		await user.clear(screen.getByRole("textbox", { name: "表示名" }));
		await user.type(screen.getByRole("textbox", { name: "表示名" }), "たろう");
		await user.clear(screen.getByRole("textbox", { name: "ハンドル" }));
		await user.type(screen.getByRole("textbox", { name: "ハンドル" }), "taro");
		await user.click(screen.getByRole("button", { name: "保存する" }));

		expect(onSave).toHaveBeenCalledWith({ name: "たろう", handle: "taro" });
		// ボタンの完了表示と、読み上げ用の出力の2か所に出る。
		expect((await screen.findAllByText("保存しました")).length).toBeGreaterThan(
			0,
		);
		expect(onChanged).toHaveBeenCalledTimes(1);
	});

	it("初期の名前の確認を求めない（お知らせも、確認のボタンも、出さない）", () => {
		setup();

		expect(screen.queryByText(/まだ確認していません/)).toBeNull();
		expect(
			screen.queryByRole("button", { name: "この名前のままにする" }),
		).toBeNull();
	});

	it("検証に失敗したら、項目ごとに、文を出す", async () => {
		const { user } = setup({
			ok: false,
			errors: {
				name: "表示名に、@ は使えません（メールアドレスを入れないためです）。",
				handle: "このハンドルは、すでに使われています。",
			},
		});

		await user.click(screen.getByRole("button", { name: "保存する" }));

		const alerts = await screen.findAllByRole("alert");

		expect(alerts.map((alert) => alert.textContent)).toEqual([
			"表示名に、@ は使えません（メールアドレスを入れないためです）。",
			"このハンドルは、すでに使われています。",
		]);
	});

	it("保存に失敗しても（通信の失敗など）、全体のエラーを出す", async () => {
		const onSave = vi.fn(async () => {
			throw new Error("network");
		});

		render(<ProfileForm profile={profile} onSave={onSave} />);
		await userEvent.click(screen.getByRole("button", { name: "保存する" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"保存できませんでした",
		);
	});
});
