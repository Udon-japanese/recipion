import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../../styles.css";
import { RecipeYieldStepper } from "./recipe-yield-stepper";

// 本物のブラウザでは、押したあとの mouseup で選択が外れることがあるので、押してすぐ打てば置き換わることを確かめる。
it("できあがりの数を押してすぐ打つと、数が置き換わり、Enter で確定する", async () => {
	const onChange = vi.fn();

	await render(
		<RecipeYieldStepper
			yieldText="クッキー8個"
			wanted={undefined}
			onChange={onChange}
		/>,
	);

	const input = page.getByRole("textbox", { name: "できあがりの数" });

	await input.click();
	await userEvent.keyboard("16");
	await expect.element(input).toHaveValue("16");

	await userEvent.keyboard("{Enter}");
	expect(onChange).toHaveBeenLastCalledWith(16);
});
