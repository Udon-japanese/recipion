import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import "../../../../styles.css";
import { InventoryScene } from "./inventory-scene";

function scene(petVisible: boolean) {
	return (
		<InventoryScene
			zones={[]}
			night={false}
			petVisible={petVisible}
			toolbar={null}
			selectedItemId={null}
			onOpen={() => {}}
			onDismissPanel={() => {}}
		/>
	);
}

function pet() {
	const button = document.querySelector<HTMLElement>(
		"button[aria-label='れしぽよをつつく']",
	);

	if (!button) {
		throw new Error("れしぽよが見つかりません");
	}

	return button;
}

// 目的地にいるまま隠して、また出すと、位置が NaN になり、ふきだしだけが残った。
it("れしぽよを隠して、また出しても、場面の中の位置に戻る", async () => {
	const screen = await render(scene(true));

	await new Promise((resolve) => setTimeout(resolve, 300));
	await screen.rerender(scene(false));
	await screen.rerender(scene(true));
	await new Promise((resolve) => setTimeout(resolve, 300));

	expect(pet().style.left).toMatch(/^[\d.]+%$/);
	expect(pet().style.top).toMatch(/^[\d.]+%$/);
});
