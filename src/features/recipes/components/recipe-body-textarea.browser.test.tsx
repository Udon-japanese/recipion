import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RecipeBodyTextarea } from "./recipe-body-textarea";

function Harness() {
	const [value, setValue] = useState("");

	return (
		<RecipeBodyTextarea
			value={value}
			onChange={setValue}
			recipeNames={["玉ねぎ"]}
		/>
	);
}

function textareaValue(): string {
	return (document.querySelector("textarea") as HTMLTextAreaElement).value;
}

// 自動で入れた番号は、ブラウザの「元に戻す」の履歴に残り、1回で、入れる前に戻る。
test("番号の自動入力を、元に戻せる", async () => {
	await render(<Harness />);

	await userEvent.click(page.getByRole("textbox", { name: "レシピの本文" }));
	await userEvent.keyboard("1. 混ぜる{Enter}");

	expect(textareaValue()).toBe("1. 混ぜる\n2. ");

	document.execCommand("undo");

	expect(textareaValue()).toBe("1. 混ぜる");

	document.execCommand("redo");

	expect(textareaValue()).toBe("1. 混ぜる\n2. ");
});

test("補完で入れた文字を、元に戻せる", async () => {
	await render(<Harness />);

	await userEvent.click(page.getByRole("textbox", { name: "レシピの本文" }));
	await userEvent.keyboard("＜作{Tab}");

	expect(textareaValue()).toBe("＜作り方＞\n");

	document.execCommand("undo");

	expect(textareaValue()).toBe("＜作");
});

// IME の変換中は、補完を出さない。確定したあとに出す。
test("変換中は補完を出さず、確定したあとに出す", async () => {
	await render(<Harness />);

	await userEvent.click(page.getByRole("textbox", { name: "レシピの本文" }));

	const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
	const candidateList = () =>
		document.querySelector('[aria-label="補完の候補"]');

	textarea.dispatchEvent(
		new CompositionEvent("compositionstart", { bubbles: true }),
	);
	await userEvent.keyboard("＜作");

	expect(candidateList()).toBeNull();

	textarea.dispatchEvent(
		new CompositionEvent("compositionend", { bubbles: true }),
	);

	await expect.poll(candidateList).not.toBeNull();
});
