import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ZonePicker } from "./zone-picker";

const counts = { fridge: 3, door: 1, freezer: 0 };

describe("ZonePicker", () => {
	it("押すと、場所の一覧のシートが開き、選ぶと、閉じて、その場所が渡る", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<ZonePicker
				variant="heading"
				value="fridge"
				counts={counts}
				onChange={onChange}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "場所：冷蔵室。場所を選ぶ" }),
		);

		const sheet = await screen.findByRole("dialog", { name: "場所" });

		expect(
			within(sheet).getByRole("button", { name: /^冷蔵室/u }),
		).toHaveAttribute("aria-current", "true");

		await user.click(within(sheet).getByRole("button", { name: /^ドア/u }));

		expect(onChange).toHaveBeenCalledWith("door");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	it("「すべて」を選べるときは、一覧の先頭に、件数つきで出る。選ぶと、null が渡る", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<ZonePicker
				variant="field"
				value={null}
				counts={counts}
				allCount={4}
				onChange={onChange}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "場所：すべて。場所を選ぶ" }),
		);

		const sheet = await screen.findByRole("dialog", { name: "場所" });

		expect(
			within(sheet).getByRole("button", { name: /^すべて\s*4/u }),
		).toBeTruthy();

		await user.click(within(sheet).getByRole("button", { name: /^すべて/u }));

		expect(onChange).toHaveBeenCalledWith(null);
	});
});
