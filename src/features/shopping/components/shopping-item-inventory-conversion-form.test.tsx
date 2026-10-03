import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createShoppingItem, type ShoppingItem } from "../domain/shopping-item";
import { ShoppingItemInventoryConversionForm } from "./shopping-item-inventory-conversion-form";

function createItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
	return {
		...createShoppingItem({
			name: "謎の商品",
			quantity: 1,
			unitLabel: "袋",
		}),
		...overrides,
	};
}

describe("ShoppingItemInventoryConversionForm", () => {
	it("既知の商品ではプリセットから換算を設定できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();

		render(
			<ShoppingItemInventoryConversionForm
				item={createItem({
					name: "たまご",
					unitLabel: null,
				})}
				onSave={onSave}
				onCancel={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: "6個",
			}),
		);

		expect(onSave).toHaveBeenCalledWith({
			quantity: 6,
			unitLabel: "個",
			inventoryConversion: {
				inputUnitCode: "count",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "exact",
			},
		});
	});

	it("未知の商品では在庫換算を入力できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();

		render(
			<ShoppingItemInventoryConversionForm
				item={createItem()}
				onSave={onSave}
				onCancel={vi.fn()}
			/>,
		);

		await user.selectOptions(screen.getByLabelText("在庫で使う単位"), "g");

		await user.clear(screen.getByLabelText("1袋あたりの数量"));

		await user.type(screen.getByLabelText("1袋あたりの数量"), "150");

		await user.click(
			screen.getByRole("button", {
				name: "設定を保存",
			}),
		);

		expect(onSave).toHaveBeenCalledWith({
			quantity: 1,
			unitLabel: "袋",
			inventoryConversion: {
				inputUnitCode: "袋",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 150,
				trackingMode: "estimated",
			},
		});
	});
});
