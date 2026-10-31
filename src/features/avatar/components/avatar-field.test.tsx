import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { avatarPresets, defaultAvatarFor } from "../domain/avatar-presets";
import { AvatarField } from "./avatar-field";

function firstPreset() {
	const preset = avatarPresets[0];

	if (!preset) throw new Error("プリセットがありません");

	return preset;
}

describe("AvatarField", () => {
	it("作っていなければ、ユーザーごとのプリセットから始め、そのまま決定すると、それを保存する", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn().mockResolvedValue(true);
		const start = defaultAvatarFor("user-1");

		render(<AvatarField userId="user-1" avatar={null} onSave={onSave} />);

		await user.click(screen.getByRole("button", { name: "アバターを編集" }));
		const dialog = await screen.findByRole("dialog", { name: "アバター" });

		await user.click(within(dialog).getByRole("button", { name: "決定" }));

		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith({
				background: start.background,
				placements: start.placements,
			}),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: "アバター" })).toBeNull(),
		);
	});

	it("セットを選ぶと、背景もそのセットの色になる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn().mockResolvedValue(true);
		const preset = firstPreset();

		render(
			<AvatarField
				userId="user-1"
				avatar={{
					background: "charcoal",
					placements: [{ partId: "tomato", x: 50, y: 50 }],
				}}
				onSave={onSave}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "アバターを編集" }));
		const dialog = await screen.findByRole("dialog", { name: "アバター" });

		await user.click(within(dialog).getByRole("button", { name: "セット" }));
		await user.click(
			within(dialog).getByRole("button", { name: preset.label }),
		);
		await user.click(within(dialog).getByRole("button", { name: "決定" }));

		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith({
				background: preset.background,
				placements: preset.placements,
			}),
		);
	});

	it("部品を全部消して決定すると、保存せずに理由を出す。保存に失敗したら、開いたままにする", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn().mockResolvedValue(false);

		render(<AvatarField userId="user-1" avatar={null} onSave={onSave} />);

		await user.click(screen.getByRole("button", { name: "アバターを編集" }));
		const dialog = await screen.findByRole("dialog", { name: "アバター" });

		await user.click(within(dialog).getByRole("button", { name: "全部消す" }));
		await user.click(within(dialog).getByRole("button", { name: "決定" }));

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"部品を1つ以上置いてください",
		);
		expect(onSave).not.toHaveBeenCalled();

		await user.click(
			within(dialog).getByRole("button", { name: "ひとつ戻す" }),
		);
		await user.click(within(dialog).getByRole("button", { name: "決定" }));

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"保存できませんでした",
		);
		expect(screen.getByRole("dialog", { name: "アバター" })).toBeVisible();
	});
});
