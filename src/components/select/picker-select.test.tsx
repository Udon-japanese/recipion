import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Field, SelectBox } from "../field/field";

function Demo({ onValue }: { onValue?: (value: string) => void }) {
	const [value, setValue] = useState("fridge");

	return (
		<Field label="保存方法">
			{(control) => (
				<SelectBox
					{...control}
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
						onValue?.(event.target.value);
					}}
				>
					<option value="room">常温</option>
					<option value="fridge">冷蔵</option>
					<option value="freezer">冷凍</option>
				</SelectBox>
			)}
		</Field>
	);
}

function mockCompact(compact: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: compact && query.includes("max-width"),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

describe("PickerSelect（選択の一覧）", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("PC：押すと一覧が出て、選ぶと値が変わり、閉じる", async () => {
		mockCompact(false);
		const user = userEvent.setup();
		const onValue = vi.fn();
		render(<Demo onValue={onValue} />);

		await user.click(screen.getByLabelText("保存方法"));

		expect(screen.getByRole("button", { name: "冷蔵" })).toHaveAttribute(
			"aria-current",
			"true",
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "冷凍" }));

		expect(onValue).toHaveBeenCalledWith("freezer");
		expect(screen.getByLabelText("保存方法")).toHaveValue("freezer");
		expect(screen.queryByRole("button", { name: "常温" })).toBeNull();
	});

	it("PC：Esc で閉じて、値は変えない", async () => {
		mockCompact(false);
		const user = userEvent.setup();
		render(<Demo />);

		await user.click(screen.getByLabelText("保存方法"));
		await user.keyboard("{Escape}");

		expect(screen.queryByRole("button", { name: "常温" })).toBeNull();
		expect(screen.getByLabelText("保存方法")).toHaveValue("fridge");
	});

	it("PC：キーボードの Enter で開き、矢印で動き、Enter で選ぶ", async () => {
		mockCompact(false);
		const user = userEvent.setup();
		render(<Demo />);

		screen.getByLabelText("保存方法").focus();
		await user.keyboard("{Enter}");
		await user.keyboard("{ArrowDown}{Enter}");

		expect(screen.getByLabelText("保存方法")).toHaveValue("freezer");
	});

	it("スマホ：ボトムシートで選ぶ", async () => {
		mockCompact(true);
		const user = userEvent.setup();
		render(<Demo />);

		await user.click(screen.getByLabelText("保存方法"));

		expect(
			screen.getByRole("dialog", { name: "保存方法" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "常温" }));

		expect(screen.getByLabelText("保存方法")).toHaveValue("room");
	});

	it("これまでどおり、selectOptions でも選べる", async () => {
		mockCompact(false);
		const user = userEvent.setup();
		render(<Demo />);

		await user.selectOptions(screen.getByLabelText("保存方法"), "room");

		expect(screen.getByLabelText("保存方法")).toHaveValue("room");
	});
});
