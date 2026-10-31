import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../../../styles.css";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { InventoryList } from "../inventory-list";

const milk = buildInventoryListItem({
	inventoryItemId: "milk",
	name: "牛乳",
	quantity: 600,
	stockUnitCode: "ml",
	stockUnitLabel: "ml",
	lots: [
		{
			id: "lot-1",
			quantity: 600,
			acquiredOn: "2026-10-01",
			storage: "fridge",
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
			createdAt: "2026-10-01T00:00:00.000Z",
		},
	],
});

function panelRect(name: string): DOMRect {
	const panel = document.querySelector(`aside[aria-label="${name}"]`);

	if (!panel) {
		throw new Error(`${name}のパネルが見つかりません`);
	}

	return panel.getBoundingClientRect();
}

it("PC では、入れた分の編集を、食材のパネルの横に、重ならないように出す", async () => {
	await page.viewport(1280, 900);
	render(
		<InventoryList
			ownerScope="user:u"
			loadInventoryItems={async () => ({
				items: [milk],
				source: "network",
				cachedAt: null,
			})}
			setLotQuantity={vi.fn()}
		/>,
	);

	await page.getByRole("button", { name: /^牛乳、/u }).click();
	await page.getByRole("button", { name: "10/1に入れた分を直す" }).click();

	await expect
		.element(page.getByRole("complementary", { name: "10/1に入れた分" }))
		.toBeVisible();

	const main = panelRect("牛乳");
	const editor = panelRect("10/1に入れた分");

	expect(editor.left >= main.right || editor.right <= main.left).toBe(true);
	expect(editor.top).toBeCloseTo(main.top, -1);
});

it("食材のパネルを動かすと、横の編集も、付いて動く", async () => {
	await page.viewport(1280, 900);
	render(
		<InventoryList
			ownerScope="user:u"
			loadInventoryItems={async () => ({
				items: [milk],
				source: "network",
				cachedAt: null,
			})}
			setLotQuantity={vi.fn()}
		/>,
	);

	await page.getByRole("button", { name: /^牛乳、/u }).click();
	await page.getByRole("button", { name: "10/1に入れた分を直す" }).click();
	await expect
		.element(page.getByRole("complementary", { name: "10/1に入れた分" }))
		.toBeVisible();

	const before = panelRect("10/1に入れた分");

	// 見出しで、Alt + 下矢印（ドラッグの代わり）。本体が下へ動く。
	await page.getByRole("heading", { name: "牛乳" }).click();
	await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");

	await expect
		.poll(() => panelRect("10/1に入れた分").top)
		.toBeGreaterThan(before.top);
	expect(panelRect("10/1に入れた分").top).toBeCloseTo(
		panelRect("牛乳").top,
		-1,
	);
});
