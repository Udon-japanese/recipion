import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../../styles.css";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import { RecipeShoppingSection } from "./recipe-shopping-section";

// 「買い物メモを開く」のリンクは、ルーターの外では、描画できないため、差し替える。
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/shopping">{children}</a>
	),
}));

// 件数が2桁（12件）でも、ボタンの文字が切れないことを確かめる。
const ingredients = Array.from({ length: 12 }, (_, index) => ({
	type: "ingredient",
	id: `i${index}`,
	status: "parsed",
	rawText: `材料${index} 1個`,
	name: `材料${index}`,
	amountText: "1個",
	quantity: 1,
	unitLabel: "個",
})) as RecipeEditorIngredientNode[];

// ボタンの文字（ラベルの文字そのもの）が、ボタンの枠の中に収まっているか。
// ボタンは overflow: hidden で中央寄せなので、scrollWidth では余白のはみ出しまで数えてしまう。
function labelFits(button: Element, label: string): boolean {
	const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();

	while (node && node.textContent !== label) {
		node = walker.nextNode();
	}

	if (!node) {
		throw new Error(`「${label}」の文字がありません`);
	}

	const range = document.createRange();
	range.selectNodeContents(node);
	const text = range.getBoundingClientRect();
	const box = button.getBoundingClientRect();

	return text.left >= box.left && text.right <= box.right;
}

async function openFooter() {
	await render(
		<RecipeShoppingSection
			ingredients={ingredients}
			ownerScope="guest"
			shoppingRepository={createFakeShoppingRepository()}
		/>,
	);
	await page.getByRole("button", { name: "買い物メモへ" }).click();

	// 見出しの × も「閉じる」なので、下のボタン（後ろ）を取る。
	const close = page.getByRole("button", { name: "閉じる" }).last();
	const apply = page.getByRole("button", {
		name: "選んだものを入れる（12件）",
	});

	await expect.element(apply).toBeVisible();

	return { close: close.element(), apply: apply.element() };
}

// 下の2つのボタンは、PC でもスマホでも、横に並べる（主ボタンを右）。
it.each([
	{ width: 1280, height: 800 },
	{ width: 375, height: 812 },
	{ width: 360, height: 780 },
])(
	"$width px の幅で、閉じると入れるが横に並び、どちらの文字も切れない",
	async ({ width, height }) => {
		await page.viewport(width, height);

		const { close, apply } = await openFooter();
		const closeRect = close.getBoundingClientRect();
		const applyRect = apply.getBoundingClientRect();

		expect(applyRect.top).toBe(closeRect.top);
		expect(applyRect.left).toBeGreaterThan(closeRect.right);
		expect(labelFits(apply, "選んだものを入れる（12件）")).toBe(true);
		expect(labelFits(close, "閉じる")).toBe(true);
	},
);
