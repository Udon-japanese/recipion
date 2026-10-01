import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeEditorDocument } from "../domain/recipe-editor-document";
import { RecipeEditor } from "./recipe-editor";

afterEach(cleanup);

describe("RecipeEditor", () => {
	it("取り込んだ材料を既存グループへ移して保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			id: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await user.type(
			screen.getByRole("textbox", { name: "レシピ名" }),
			"つくね",
		);
		await user.type(
			screen.getByRole("textbox", { name: "材料" }),
			"肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個",
		);
		await user.click(screen.getByRole("button", { name: "材料を読み取る" }));

		// 前提：「肉だね」がグループとして取り込まれている（なければここで落ちる）
		const initialSelect = screen.getByRole("combobox", {
			name: "豚ひき肉のグループ",
		});
		within(initialSelect).getByRole("option", { name: "肉だね" });

		// グループ外へ出す
		await user.selectOptions(initialSelect, "グループ外");
		const movedOutSelect = screen.getByRole("combobox", {
			name: "豚ひき肉のグループ",
		});
		expect(movedOutSelect).toHaveProperty("value", "");

		// 既存グループへ戻す（末尾に入るので順序が入れ替わる）
		await user.selectOptions(movedOutSelect, "肉だね");

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				ingredients: [
					expect.objectContaining({
						type: "group",
						name: "肉だね",
						children: [
							expect.objectContaining({ type: "ingredient", name: "玉ねぎ" }),
							expect.objectContaining({ type: "ingredient", name: "豚ひき肉" }),
						],
					}),
				],
			}),
		);
	});

	it("不要な材料を削除でき、空になったグループも消える", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			id: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await user.type(
			screen.getByRole("textbox", { name: "レシピ名" }),
			"つくね",
		);
		await user.type(
			screen.getByRole("textbox", { name: "材料" }),
			"肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個",
		);
		await user.click(screen.getByRole("button", { name: "材料を読み取る" }));

		await user.click(screen.getByRole("button", { name: "豚ひき肉を削除" }));
		expect(screen.queryByRole("button", { name: "豚ひき肉を削除" })).toBeNull();
		expect(screen.getByRole("button", { name: "玉ねぎを削除" })).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "玉ねぎを削除" }));
		expect(screen.getByText("材料はまだありません。")).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ ingredients: [] }),
		);
	});
});
