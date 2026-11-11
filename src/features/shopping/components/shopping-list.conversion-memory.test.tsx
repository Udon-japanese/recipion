import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { toConversionMemoryKey } from "#/test/builders/conversion-memory-key";
import { createFakeShoppingConversionDefaultRepository } from "#/test/fakes/fake-shopping-conversion-default-repository";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import { getLocalDatabase } from "../../../local-db/database";
import {
	type ShoppingConversionDefault,
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
} from "../domain/shopping-conversion-default";
import type { ShoppingItem } from "../domain/shopping-item";
import { ShoppingList } from "./shopping-list";

// 追加した項目は、端末のいつもの買い方に入る。前のテストの記憶を持ち越さない。
beforeEach(async () => {
	await getLocalDatabase().scopedShoppingItemMemories.clear();
});

afterEach(() => {
	localStorage.clear();
});

const nameKey = toConversionDefaultKey("たまご") ?? "";

// 覚えた記憶のうち、その換算のもの（鍵は ID なので、中身で探す）。
function findRemembered(defaults: ShoppingConversionDefaults, perUnit: number) {
	return Object.values(defaults).find(
		(entry) =>
			entry.unitLabel === "個" &&
			entry.inventoryConversion.stockQuantityPerInputUnit === perUnit,
	);
}

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

// 購入確定 → 換算が足りない（量を聞く画面）→ 「6個」を選んで、確定、までを進める。
async function setUpAndChooseSixPack(initial: ShoppingConversionDefaults = {}) {
	const user = userEvent.setup();
	const repository = createFakeShoppingRepository([checkedItem]);
	const conversionDefaultRepository =
		createFakeShoppingConversionDefaultRepository(initial);
	const confirmPurchases = vi
		.fn()
		.mockResolvedValue({ status: "confirmed", items: [purchasedItem] });

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
	await user.click(await screen.findByRole("button", { name: "6個" }));
	await user.click(screen.getByRole("button", { name: "購入確定" }));

	return { user, conversionDefaultRepository, confirmPurchases };
}

describe("ShoppingList の在庫換算の記憶", () => {
	it("記憶のない食材は、換算を設定した瞬間に覚える（聞かずに、そのまま購入確定を続ける）", async () => {
		const { conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack();

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));
		expect(
			findRemembered(conversionDefaultRepository.defaults, 1),
		).toMatchObject({
			unitLabel: "個",
			inventoryConversion: sixPackConversion,
		});
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("同じ換算なら、聞かない", async () => {
		const { confirmPurchases } = await setUpAndChooseSixPack(
			remembered({ unitLabel: "個", inventoryConversion: sixPackConversion }),
		);

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));
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

	it("記憶と違う換算でも聞かずに、別の1件として覚え、購入確定を続ける（前の換算も残る）", async () => {
		const { conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack(remembered(different));

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(
			findRemembered(conversionDefaultRepository.defaults, 1),
		).toBeDefined();
		expect(
			findRemembered(conversionDefaultRepository.defaults, 2),
		).toBeDefined();
	});

	it("食材ごとの記憶は2件まで。超えたら、使った時刻の古いものから消す（単位をまたいで数える）", async () => {
		const packConversion = {
			...sixPackConversion,
			inputUnitCode: "パック",
			stockQuantityPerInputUnit: 10,
		};
		const { conversionDefaultRepository, confirmPurchases } =
			await setUpAndChooseSixPack({
				old: { ...different, nameKey, usedAt: 1 },
				newer: {
					unitLabel: "パック",
					inventoryConversion: packConversion,
					nameKey,
					usedAt: 2,
				},
			});

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));

		const defaults = conversionDefaultRepository.defaults;

		expect(Object.keys(defaults)).toHaveLength(2);
		expect(defaults.old).toBeUndefined();
		expect(defaults.newer).toBeDefined();
		expect(findRemembered(defaults, 1)).toBeDefined();
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

		await waitFor(() => expect(confirmPurchases).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(Object.keys(conversionDefaultRepository.defaults)).toHaveLength(2);
	});

	it("編集のシートで換算を直すと、聞かずに、直した換算を新しい記憶として覚える", async () => {
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
			await screen.findByRole("button", { name: "たまごのその他" }),
		);
		await user.click(screen.getByRole("menuitem", { name: "編集" }));

		const sheet = await screen.findByRole("dialog", { name: "たまごを直す" });

		await user.click(within(sheet).getByRole("button", { name: "変える" }));

		const amount = within(sheet).getByLabelText("たまごの1個あたりの数");

		expect(amount).toHaveValue("2");

		await user.clear(amount);
		await user.type(amount, "1");
		await user.click(within(sheet).getByRole("button", { name: "保存" }));

		await waitFor(() =>
			expect(
				findRemembered(conversionDefaultRepository.defaults, 1),
			).toBeDefined(),
		);
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(
			repository.items[0]?.inventoryConversion?.stockQuantityPerInputUnit,
		).toBe(1);
	});
});
