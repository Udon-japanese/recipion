import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { createFakeShoppingConversionDefaultRepository } from "#/test/fakes/fake-shopping-conversion-default-repository";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import {
	type ShoppingConversionDefault,
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
	toConversionMemoryKey,
} from "../domain/shopping-conversion-default";
import type { ShoppingItem } from "../domain/shopping-item";
import { ShoppingList } from "./shopping-list";

afterEach(() => {
	localStorage.clear();
});

const nameKey = toConversionDefaultKey("たまご") ?? "";
const key = toConversionMemoryKey(nameKey, "個");

// 記憶1件（食材×単位）の入れ物。
function remembered(
	value: ShoppingConversionDefault,
): ShoppingConversionDefaults {
	return {
		[toConversionMemoryKey(nameKey, value.unitLabel)]: {
			...value,
			nameKey,
			usedAt: 1,
		},
	};
}

// 「6個」の候補を選ぶと設定される換算（1個＝1個、正確）。
const sixPackConversion = {
	inputUnitCode: "count",
	stockUnitCode: "count" as const,
	stockUnitLabel: "個",
	stockQuantityPerInputUnit: 1,
	trackingMode: "exact" as const,
};

const checkedItem: ShoppingItem = buildShoppingItem({
	name: "たまご",
	quantity: 1,
	unitLabel: null,
	status: "checked",
	inventoryConversion: null,
	categoryAssignment: "manual",
});

const purchasedItem: ShoppingItem = {
	...checkedItem,
	quantity: 6,
	unitLabel: "個",
	inventoryConversion: sixPackConversion,
	status: "purchased",
};

// 購入確定 →（期限の確認）→ 換算が足りない → 「6個」を選ぶ、までを進める。
async function setUpAndChooseSixPack(initial: ShoppingConversionDefaults = {}) {
	const user = userEvent.setup();
	const repository = createFakeShoppingRepository([checkedItem]);
	const conversionDefaultRepository =
		createFakeShoppingConversionDefaultRepository(initial);
	const confirmPurchases = vi
		.fn()
		.mockResolvedValueOnce({
			status: "missing-conversion",
			items: [checkedItem],
		})
		.mockResolvedValueOnce({ status: "confirmed", items: [purchasedItem] });

	render(
		<ShoppingList
			repository={repository}
			conversionDefaultRepository={conversionDefaultRepository}
			confirmPurchases={confirmPurchases}
		/>,
	);

	await user.click(
		await screen.findByRole("button", { name: "購入を確定（1件）" }),
	);
	await user.click(await screen.findByRole("button", { name: "購入確定" }));
	await screen.findByRole("heading", { name: "たまごを在庫へ追加する方法" });
	await user.click(screen.getByRole("button", { name: "6個" }));

	return { user, conversionDefaultRepository, confirmPurchases };
}

describe("ShoppingList の在庫換算の記憶", () => {
	it("記憶のない食材は、換算を設定した瞬間に覚える（聞かずに、そのまま購入確定を続ける）", async () => {
		const { conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack();

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(2));
		expect(conversionDefaultRepository.defaults[key]).toMatchObject({
			unitLabel: "個",
			inventoryConversion: sixPackConversion,
		});
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("同じ換算なら、聞かない", async () => {
		const { confirmPurchases } = await setUpAndChooseSixPack(
			remembered({ unitLabel: "個", inventoryConversion: sixPackConversion }),
		);

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	// 同じ「個」でも、換算が違う記憶（食材×単位が同じで、内容が違うときだけ聞く）。
	const different: ShoppingConversionDefault = {
		unitLabel: "個",
		inventoryConversion: {
			inputUnitCode: "count",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			stockQuantityPerInputUnit: 2,
			trackingMode: "estimated",
		},
	};

	it("記憶と違う換算なら、変えるかを聞く。「今回だけ」なら、記憶は変えずに購入確定を続ける", async () => {
		const { user, conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack(remembered(different));

		const dialog = await screen.findByRole("alertdialog");

		expect(dialog.textContent).toContain("たまごのいつもの換算を変えますか");
		expect(dialog.textContent).toContain("1個＝2個");
		expect(dialog.textContent).toContain("1個＝1個");
		// 答えるまで、購入確定は、やり直さない。
		expect(confirmPurchases).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "今回だけ" }));

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(2));
		expect(conversionDefaultRepository.defaults[key]).toMatchObject(different);
	});

	it("「変える」なら、記憶を置き換えて、購入確定を続ける", async () => {
		const { user, conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack(remembered(different));

		await user.click(await screen.findByRole("button", { name: "変える" }));

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(2));
		expect(conversionDefaultRepository.defaults[key]).toMatchObject({
			unitLabel: "個",
			inventoryConversion: sixPackConversion,
		});
	});

	it("違う単位の記憶は、別に覚える（聞かない）", async () => {
		const packConversion = {
			...sixPackConversion,
			inputUnitCode: "パック",
			stockQuantityPerInputUnit: 10,
		};
		const { conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack(
				remembered({
					unitLabel: "パック",
					inventoryConversion: packConversion,
				}),
			);

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(Object.keys(conversionDefaultRepository.defaults)).toHaveLength(2);
	});

	it("行の換算を押して直すと、聞かずに、その食材×単位の記憶を更新する", async () => {
		const user = userEvent.setup();
		const packItem: ShoppingItem = buildShoppingItem({
			name: "たまご",
			quantity: 1,
			unitLabel: "個",
			status: "pending",
			categoryAssignment: "manual",
			inventoryConversion: {
				...sixPackConversion,
				stockQuantityPerInputUnit: 2,
				trackingMode: "estimated",
			},
		});
		const repository = createFakeShoppingRepository([packItem]);
		const conversionDefaultRepository =
			createFakeShoppingConversionDefaultRepository(
				remembered({
					unitLabel: "個",
					inventoryConversion:
						packItem.inventoryConversion ?? sixPackConversion,
				}),
			);

		render(
			<ShoppingList
				repository={repository}
				conversionDefaultRepository={conversionDefaultRepository}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "たまごの在庫への換算を直す",
			}),
		);
		await screen.findByRole("heading", { name: "たまごを在庫へ追加する方法" });
		await user.click(screen.getByRole("button", { name: "6個" }));

		await waitFor(() =>
			expect(
				conversionDefaultRepository.defaults[key]?.inventoryConversion
					.stockQuantityPerInputUnit,
			).toBe(1),
		);
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(
			repository.items[0]?.inventoryConversion?.stockQuantityPerInputUnit,
		).toBe(1);
	});
});
