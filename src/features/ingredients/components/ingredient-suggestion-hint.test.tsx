import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildDictionary } from "#/test/builders/build-ingredient-dictionary";
import { IngredientDictionaryScope } from "./ingredient-dictionary-context";
import { IngredientSuggestionHint } from "./ingredient-suggestion-hint";

const dictionary = buildDictionary([{ name: "マイだし" }]);

describe("IngredientSuggestionHint", () => {
	it("［〇〇にする］で入力を置き換え、［同じ材料にする］で統合を送る", async () => {
		const user = userEvent.setup();
		const onReplace = vi.fn();
		const mergeNames = vi.fn(async () => {});

		render(
			<IngredientDictionaryScope
				dictionary={dictionary}
				mergeNames={mergeNames}
			>
				<IngredientSuggestionHint name="鶏むね" onReplace={onReplace} />
			</IngredientDictionaryScope>,
		);

		expect(screen.getByText("鶏むね肉")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "鶏むね肉にする" }));
		expect(onReplace).toHaveBeenCalledWith("鶏むね肉");

		await user.click(
			screen.getByRole("button", { name: "鶏むねを鶏むね肉と同じ材料にする" }),
		);
		expect(mergeNames).toHaveBeenCalledWith("鶏むね", "鶏むね肉");
	});

	it("まとめられなければ、理由を出す", async () => {
		const user = userEvent.setup();

		render(
			<IngredientDictionaryScope
				dictionary={dictionary}
				mergeNames={async () => {
					throw new Error("どちらにも在庫があるため、まとめられません");
				}}
			>
				<IngredientSuggestionHint name="鶏むね" />
			</IngredientDictionaryScope>,
		);

		await user.click(
			screen.getByRole("button", { name: "鶏むねを鶏むね肉と同じ材料にする" }),
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"どちらにも在庫",
		);
	});

	it("ゲスト（操作なし）は［同じ材料にする］を出さず、知っている名前には何も出さない", () => {
		const { rerender } = render(<IngredientSuggestionHint name="鶏むね" />);

		expect(screen.getByText("鶏むね肉")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /同じ材料にする/u }),
		).toBeNull();

		rerender(<IngredientSuggestionHint name="鶏むね肉" />);
		expect(screen.queryByText(/もしかして/u)).toBeNull();
	});
});
