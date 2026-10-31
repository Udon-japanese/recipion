import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import type {
	ShoppingItem,
	UpdateShoppingItemInput,
} from "../domain/shopping-item";
import { ShoppingItemEditSheet } from "./shopping-item-edit-sheet";

const stores = [
	{
		id: "aeon",
		name: "イオン",
		sortOrder: 0,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
	{
		id: "gyomu",
		name: "業務スーパー",
		sortOrder: 1,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
];

function setup(item = buildShoppingItem({ name: "牛乳", storeId: "aeon" })) {
	const onSave = vi.fn(
		async (_item: ShoppingItem, _input: UpdateShoppingItemInput) => true,
	);
	const onClose = vi.fn();

	render(
		<ShoppingItemEditSheet
			item={item}
			stores={stores}
			onCreateStore={async () => null}
			onSave={onSave}
			onClose={onClose}
		/>,
	);

	return { onSave, onClose };
}

describe("ShoppingItemEditSheet", () => {
	it("いまの内容が入った状態で開き、何も変えなければ、Esc で保存せずに閉じる", async () => {
		const user = userEvent.setup();
		const { onSave, onClose } = setup();

		expect(screen.getByLabelText("商品名")).toHaveValue("牛乳");
		expect(screen.getByRole("button", { name: "イオン" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("直しかけのときは、Esc で閉じない（「やめる」なら閉じる）", async () => {
		const user = userEvent.setup();
		const { onSave, onClose } = setup();

		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "2");
		await user.keyboard("{Escape}");

		expect(onClose).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "やめる" }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("数量と店を直して保存すると、直した内容で保存する", async () => {
		const user = userEvent.setup();
		const { onSave } = setup();

		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "2");
		await user.click(screen.getByRole("button", { name: "業務スーパー" }));
		await user.click(screen.getByRole("button", { name: "保存" }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ name: "牛乳" }),
			expect.objectContaining({ name: "牛乳", quantity: 2, storeId: "gyomu" }),
			{ isConversionEdited: false },
		);
	});

	it("名前を変えても、店は選んであるまま", async () => {
		const user = userEvent.setup();
		const { onSave } = setup();

		await user.clear(screen.getByLabelText("商品名"));
		await user.type(screen.getByLabelText("商品名"), "豆乳");
		await user.click(screen.getByRole("button", { name: "保存" }));

		expect(onSave).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ name: "豆乳", storeId: "aeon" }),
			expect.anything(),
		);
	});

	it("商品名が空なら、保存せず、知らせる", async () => {
		const user = userEvent.setup();
		const { onSave } = setup();

		await user.clear(screen.getByLabelText("商品名"));
		await user.click(screen.getByRole("button", { name: "保存" }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"商品名を入力してください",
		);
		expect(onSave).not.toHaveBeenCalled();
	});

	describe("在庫への換算", () => {
		const groundMeat = buildShoppingItem({
			name: "合い挽き肉",
			unitLabel: "パック",
			inventoryConversion: {
				inputUnitCode: "パック",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 300,
				trackingMode: "estimated",
			},
		});

		it("いまの換算を見せ、「変える」で直して保存すると、直した換算で保存する", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(groundMeat);

			expect(screen.getByText("1パック＝300g")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "変える" }));

			const amount = screen.getByLabelText("合い挽き肉の1パックあたりの数");

			expect(amount).toHaveValue("300");

			await user.clear(amount);
			await user.type(amount, "250");
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(onSave).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					inventoryConversion: expect.objectContaining({
						stockUnitCode: "g",
						stockQuantityPerInputUnit: 250,
					}),
				}),
				{ isConversionEdited: true },
			);
		});

		it("直した換算の入力を「閉じる」でたたんでも、直した内容は残り、保存に入る", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(groundMeat);

			await user.click(screen.getByRole("button", { name: "変える" }));

			const amount = screen.getByLabelText("合い挽き肉の1パックあたりの数");

			await user.clear(amount);
			await user.type(amount, "250");
			await user.click(screen.getByRole("button", { name: "閉じる" }));

			expect(
				screen.queryByLabelText("合い挽き肉の1パックあたりの数"),
			).toBeNull();
			expect(screen.getByText("1パック＝250g")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "変える" }));

			expect(
				screen.getByLabelText("合い挽き肉の1パックあたりの数"),
			).toHaveValue("250");

			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(onSave).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					inventoryConversion: expect.objectContaining({
						stockQuantityPerInputUnit: 250,
					}),
				}),
				{ isConversionEdited: true },
			);
		});

		it("たたんだ換算の入力が読めないときは、保存せず、開いて理由を見せる", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(groundMeat);

			await user.click(screen.getByRole("button", { name: "変える" }));
			await user.clear(screen.getByLabelText("合い挽き肉の1パックあたりの数"));
			await user.click(screen.getByRole("button", { name: "閉じる" }));
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(
				screen.getByLabelText("合い挽き肉の1パックあたりの数"),
			).toBeInTheDocument();
			expect(screen.getByRole("alert")).toHaveTextContent(
				"0より大きい数を入れてください",
			);
			expect(onSave).not.toHaveBeenCalled();
		});

		it("換算の入力を開いても、直さずに保存すれば、換算は元のまま", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(groundMeat);

			await user.click(screen.getByRole("button", { name: "変える" }));
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(onSave).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					inventoryConversion: groundMeat.inventoryConversion,
				}),
				{ isConversionEdited: false },
			);
		});

		it("換算の数が読めないときは、保存せず、理由を出す", async () => {
			const user = userEvent.setup();
			const { onSave } = setup(groundMeat);

			await user.click(screen.getByRole("button", { name: "変える" }));
			await user.clear(screen.getByLabelText("合い挽き肉の1パックあたりの数"));
			await user.click(screen.getByRole("button", { name: "保存" }));

			expect(screen.getByRole("alert")).toHaveTextContent(
				"0より大きい数を入れてください",
			);
			expect(onSave).not.toHaveBeenCalled();
		});

		it("日用品には、換算の行を出さない", () => {
			setup(
				buildShoppingItem({
					name: "トイレットペーパー",
					categoryId: "household",
					categoryAssignment: "manual",
				}),
			);

			expect(screen.queryByText("在庫では")).toBeNull();
		});
	});
});
