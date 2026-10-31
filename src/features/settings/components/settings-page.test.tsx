import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { readExpiryEstimateLevel } from "#/features/inventory/infrastructure/expiry-estimate-level-storage";
import { SettingsPage } from "./settings-page";

afterEach(() => {
	localStorage.clear();
});

describe("SettingsPage", () => {
	it("期限の目安の自動入力は、初期値が「確実なものだけ」で、選び直すと、この端末に保存する", async () => {
		const user = userEvent.setup();

		render(<SettingsPage />);

		expect(
			screen.getByRole("radio", { name: /確実なものだけ/u }),
		).toBeChecked();

		await user.click(screen.getByRole("radio", { name: /すべて/u }));

		expect(screen.getByRole("radio", { name: /すべて/u })).toBeChecked();
		expect(readExpiryEstimateLevel(localStorage)).toBe("all");
	});
});
