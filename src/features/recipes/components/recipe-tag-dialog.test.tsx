import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeTagDialog } from "./recipe-tag-dialog";

afterEach(cleanup);

function renderDialog() {
	const handlers = {
		onOpenChange: vi.fn(),
		onPublicTagsChange: vi.fn(),
		onPersonalTagsChange: vi.fn(),
	};

	render(
		<RecipeTagDialog
			open
			publicTags={[]}
			personalTags={["晩ご飯"]}
			personalTagSuggestions={["晩ご飯", "お弁当"]}
			{...handlers}
		/>,
	);

	return handlers;
}

describe("RecipeTagDialog", () => {
	it("「決める」で閉じる", async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderDialog();

		await user.click(screen.getByRole("button", { name: "決める" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("変換を確定する Enter では足さず、確定したあとの Enter で足す", () => {
		const { onPersonalTagsChange } = renderDialog();
		const input = screen.getByRole("textbox", { name: "個人用のタグを足す" });

		fireEvent.change(input, { target: { value: "週末" } });
		fireEvent.keyDown(input, { key: "Enter", isComposing: true });
		fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });

		expect(onPersonalTagsChange).not.toHaveBeenCalled();

		fireEvent.keyDown(input, { key: "Enter" });

		expect(onPersonalTagsChange).toHaveBeenCalledWith(["晩ご飯", "週末"]);
	});

	it("候補には、まだ付けていないタグだけを出す", () => {
		renderDialog();

		const suggestions = screen.getByRole("group", {
			name: "使ったことのあるタグ",
		});

		expect(suggestions.textContent).toBe("お弁当");
	});
});
