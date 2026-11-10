import { expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
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
			purchaseUnit: null,
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
				cacheReason: null,
				cachedAt: null,
			})}
			adjustInventoryItem={vi.fn()}
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
				cacheReason: null,
				cachedAt: null,
			})}
			adjustInventoryItem={vi.fn()}
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mouse(
	type: "mousePressed" | "mouseMoved" | "mouseReleased",
	x: number,
	y: number,
) {
	await cdp().send("Input.dispatchMouseEvent", {
		type,
		x,
		y,
		button: type === "mouseMoved" ? "none" : "left",
		buttons: type === "mouseReleased" ? 0 : 1,
		clickCount: 1,
	});
}

it("スマホで、入れた分の編集を開いたまま、シートを下げて離すと、パネルごと閉じる（本体が上がってこない）", async () => {
	await page.viewport(390, 844);
	render(
		<InventoryList
			ownerScope="user:u"
			loadInventoryItems={async () => ({
				items: [milk],
				source: "network",
				cacheReason: null,
				cachedAt: null,
			})}
			adjustInventoryItem={vi.fn()}
		/>,
	);

	await page.getByRole("button", { name: /^牛乳、/u }).click();
	await page.getByRole("button", { name: "10/1に入れた分を直す" }).click();
	await expect
		.element(page.getByRole("dialog", { name: "10/1に入れた分" }))
		.toBeVisible();
	await sleep(600);

	const sheet = document.querySelector('section[role="dialog"]');

	if (!sheet) {
		throw new Error("シートが見つかりません");
	}

	const rect = sheet.getBoundingClientRect();
	const x = rect.left + rect.width / 2;
	const y = rect.top + 12;

	await mouse("mousePressed", x, y);
	for (let step = 1; step <= 10; step++) {
		await mouse("mouseMoved", x, y + (rect.height * 0.6 * step) / 10);
		await sleep(40);
	}
	await sleep(150);
	await mouse("mouseReleased", x, y + rect.height * 0.6);

	await expect
		.poll(() => document.querySelector('section[role="dialog"]'))
		.toBeNull();
});
