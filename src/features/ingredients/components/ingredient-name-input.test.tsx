import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { IngredientNameInput } from "./ingredient-name-input";

function Harness({ onSelectEntry }: { onSelectEntry?: (id: string) => void }) {
	const [value, setValue] = useState("");

	return (
		<>
			<label htmlFor="name">食材名</label>
			<IngredientNameInput
				id="name"
				value={value}
				onChange={setValue}
				onSelectEntry={(entry) => onSelectEntry?.(entry.id)}
			/>
		</>
	);
}

function Form({
	onSubmit,
}: {
	onSubmit: (event: { preventDefault: () => void }) => void;
}) {
	const [value, setValue] = useState("");

	return (
		<form onSubmit={onSubmit}>
			<label htmlFor="name">食材名</label>
			<IngredientNameInput id="name" value={value} onChange={setValue} />
		</form>
	);
}

describe("IngredientNameInput", () => {
	it("入力に合う食材の候補を出し、選ぶと入力に反映する", async () => {
		const user = userEvent.setup();
		const onSelectEntry = vi.fn();

		render(<Harness onSelectEntry={onSelectEntry} />);

		const input = screen.getByLabelText("食材名");

		await user.type(input, "しょう");

		// ひらがなで、醤油が見つかる
		await user.click(await screen.findByRole("option", { name: "醤油" }));

		expect(input).toHaveValue("醤油");
		expect(onSelectEntry).toHaveBeenCalledWith("soy-sauce");
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	it("矢印キーで候補を選び、Enter で決定する", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		const input = screen.getByLabelText("食材名");

		await user.type(input, "ぎゅう");
		await user.keyboard("{ArrowDown}{Enter}");

		expect(input).toHaveValue("牛乳");
	});

	it("候補を選んでいないときの Enter は、フォームの送信を邪魔しない", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn((event: { preventDefault: () => void }) =>
			event.preventDefault(),
		);

		render(<Form onSubmit={onSubmit} />);

		await user.type(screen.getByLabelText("食材名"), "しょう{Enter}");

		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("カタログと一致した名前では候補を出さず、合わない名前でも入力できる", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		const input = screen.getByLabelText("食材名");

		await user.type(input, "卵");
		expect(screen.queryByRole("listbox")).toBeNull();

		await user.clear(input);
		await user.type(input, "ドラゴンフルーツ");
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(input).toHaveValue("ドラゴンフルーツ");
	});

	it("変換中は、カタログの名前と完全に一致していても、候補に出す。確定したら、出さない", async () => {
		render(<Harness />);

		const input = screen.getByLabelText("食材名");

		fireEvent.focus(input);
		fireEvent.compositionStart(input);
		fireEvent.change(input, { target: { value: "にんにく" } });

		expect(
			within(await screen.findByRole("listbox")).getAllByRole("option")[0],
		).toHaveTextContent("にんにく");

		fireEvent.compositionEnd(input);

		expect(screen.queryByRole("listbox")).toBeNull();
		expect(input).toHaveValue("にんにく");
	});

	it("Escape で候補を閉じる", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		await user.type(screen.getByLabelText("食材名"), "しょう");
		expect(await screen.findByRole("listbox")).toBeInTheDocument();

		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).toBeNull();
	});
});
