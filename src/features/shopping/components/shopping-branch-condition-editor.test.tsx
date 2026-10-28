import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	type BranchConditionValue,
	ShoppingBranchConditionEditor,
} from "./shopping-branch-condition-editor";

const value: BranchConditionValue = {
	storeId: "aeon",
	name: "合い挽き肉",
	quantity: "1",
	unitLabel: "パック",
	categoryId: "meat",
	isCategoryManual: false,
	presetConversion: null,
	condition: "売っていたら",
	thenLabel: "ハンバーグ",
	elseLabel: "生姜焼き",
};

function setup() {
	const onSave = vi.fn(async () => true);
	const onCancel = vi.fn();

	render(
		<ShoppingBranchConditionEditor
			value={value}
			stores={[
				{
					id: "aeon",
					name: "イオン",
					sortOrder: 0,
					createdAt: "2026-10-01T00:00:00.000Z",
				},
			]}
			onCreateStore={async () => null}
			onCancel={onCancel}
			onSave={onSave}
		/>,
	);

	return { onSave, onCancel };
}

describe("ShoppingBranchConditionEditor", () => {
	it("いまの設定を、文章で見せる", () => {
		setup();

		expect(
			screen.getByText(/イオンに合い挽き肉 1パックが売っていたら/u),
		).toBeInTheDocument();
		expect(screen.getByText("そうなら：ハンバーグ")).toBeInTheDocument();
		expect(screen.getByText("そうでなければ：生姜焼き")).toBeInTheDocument();
	});

	it("押した部品の入力だけが開き、直すと、文章がすぐに変わる", async () => {
		const user = userEvent.setup();

		setup();

		expect(screen.queryByRole("textbox", { name: "どんな時に" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "売っていたら" }));

		const field = screen.getByRole("textbox", { name: "どんな時に" });

		await user.clear(field);
		await user.type(field, "安ければ");

		expect(
			screen.getByText(/イオンに合い挽き肉 1パックが安ければ/u),
		).toBeInTheDocument();
	});

	it("直した内容で保存する", async () => {
		const user = userEvent.setup();
		const { onSave } = setup();

		await user.click(screen.getByRole("button", { name: "売っていたら" }));
		await user.clear(screen.getByRole("textbox", { name: "どんな時に" }));
		await user.type(
			screen.getByRole("textbox", { name: "どんな時に" }),
			"安ければ",
		);
		await user.click(screen.getByRole("button", { name: "保存" }));

		expect(onSave).toHaveBeenCalledWith({ ...value, condition: "安ければ" });
	});

	it("材料か、どんな時にが空なら、保存できない", async () => {
		const user = userEvent.setup();

		setup();

		await user.click(screen.getByRole("button", { name: "売っていたら" }));
		await user.clear(screen.getByRole("textbox", { name: "どんな時に" }));

		expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
	});

	it("Esc は、保存せずに、やめる", async () => {
		const user = userEvent.setup();
		const { onSave, onCancel } = setup();

		await user.keyboard("{Escape}");

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});
});
