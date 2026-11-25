import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { toConversionDefaultKey } from "../domain/shopping-conversion-default";
import type { ShoppingItem } from "../domain/shopping-item";
import type { ShoppingMemories } from "../domain/shopping-item-memory";
import {
	type BranchConditionValue,
	emptyBranchConditionValue,
	ShoppingBranchConditionEditor,
	toConditionItemInput,
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

const noMemories: ShoppingMemories = {
	itemMemories: {},
	conversionDefaults: {},
};

function setup(item?: ShoppingItem, memories: ShoppingMemories = noMemories) {
	const onSave = vi.fn(async () => true);
	const onCancel = vi.fn();

	render(
		<ShoppingBranchConditionEditor
			value={value}
			item={item}
			stores={[
				{
					id: "aeon",
					name: "イオン",
					sortOrder: 0,
					createdAt: "2026-10-01T00:00:00.000Z",
				},
			]}
			memories={memories}
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
		// 文章の店の部品は、店の名前だけ（「イオン店」としない）。
		expect(screen.getByRole("button", { name: "イオン" })).toBeInTheDocument();
	});

	it("数量の入力では、追加のシートと同じく、前の買い方とよく使う単位を出す", async () => {
		const user = userEvent.setup();
		const nameKey = toConversionDefaultKey("合い挽き肉");

		if (!nameKey) {
			throw new Error("食材名のキーを作れませんでした");
		}

		setup(undefined, {
			itemMemories: {
				[nameKey]: {
					nameKey,
					quantity: 300,
					unitLabel: "g",
					categoryId: "meat",
					categoryAssignment: "automatic",
					usedAt: 1,
				},
			},
			conversionDefaults: {},
		});

		await user.click(screen.getByRole("button", { name: "1パック" }));

		expect(
			screen.getByRole("group", { name: "前の買い方・よく使う数量" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("group", { name: "よく使う単位" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "300g" }));

		expect(
			screen.getByText(/イオンに合い挽き肉 300gが売っていたら/u),
		).toBeInTheDocument();
	});

	it("カテゴリは、材料を開いたときだけ出し、選ぶと、自分で選んだカテゴリとして保存する", async () => {
		const user = userEvent.setup();
		const { onSave } = setup();

		expect(screen.queryByRole("combobox", { name: "カテゴリ" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "合い挽き肉" }));
		await user.selectOptions(
			screen.getByRole("combobox", { name: "カテゴリ" }),
			"household",
		);
		await user.click(screen.getByRole("button", { name: "保存" }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryId: "household",
				isCategoryManual: true,
			}),
			expect.anything(),
		);
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

		expect(onSave).toHaveBeenCalledWith(
			{ ...value, condition: "安ければ" },
			{ isConversionEdited: false },
		);
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

	it("作るときは、材料の入力が開いていて、入れると作れる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async () => true);

		render(
			<ShoppingBranchConditionEditor
				mode="create"
				value={emptyBranchConditionValue}
				stores={[]}
				memories={noMemories}
				onCreateStore={async () => null}
				onCancel={() => undefined}
				onSave={onSave}
			/>,
		);

		expect(screen.getByRole("button", { name: "作る" })).toBeDisabled();

		await user.type(screen.getByLabelText("材料"), "牛乳");
		await user.click(screen.getByRole("button", { name: "作る" }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ name: "牛乳", condition: "売っていたら" }),
			{ isConversionEdited: false },
		);
		expect(
			toConditionItemInput({ ...emptyBranchConditionValue, name: "牛乳" }),
		).toMatchObject({ name: "牛乳", quantity: 1, categoryId: null });
	});

	describe("条件の材料の換算", () => {
		const conditionItem = buildShoppingItem({
			name: "合い挽き肉",
			unitLabel: "パック",
			categoryId: "meat",
			storeId: "aeon",
			branchId: "branch-1",
			branchSide: "condition",
			inventoryConversion: {
				inputUnitCode: "パック",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 300,
				trackingMode: "estimated",
			},
		});

		it("数量の入力で、いまの換算を見せ、直して保存すると、その換算で保存する", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(conditionItem);

			await user.click(screen.getByRole("button", { name: "1パック" }));

			expect(screen.getByText("1パック＝300g")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "変える" }));

			const amount = screen.getByLabelText("合い挽き肉の1パックあたりの数");

			await user.clear(amount);
			await user.type(amount, "400");
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					presetConversion: expect.objectContaining({
						stockQuantityPerInputUnit: 400,
					}),
				}),
				{ isConversionEdited: true },
			);
		});

		it("直した換算の入力をたたんでも、残っていて、保存に入る", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(conditionItem);

			await user.click(screen.getByRole("button", { name: "1パック" }));
			await user.click(screen.getByRole("button", { name: "変える" }));

			const amount = screen.getByLabelText("合い挽き肉の1パックあたりの数");

			await user.clear(amount);
			await user.type(amount, "400");
			await user.click(screen.getByRole("button", { name: "閉じる" }));

			expect(screen.getByText("1パック＝400g")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					presetConversion: expect.objectContaining({
						stockQuantityPerInputUnit: 400,
					}),
				}),
				{ isConversionEdited: true },
			);
		});
	});
});
