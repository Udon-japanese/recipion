import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { readExpiryEstimateLevel } from "#/features/inventory/infrastructure/expiry-estimate-level-storage";
import { AccountSettingsSection } from "./account-settings-section";
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

	it("ログインしているときだけ、アカウントの欄（メールアドレス・ログアウト・削除）を出す", () => {
		const { rerender } = render(<SettingsPage />);

		expect(screen.queryByRole("heading", { name: "アカウント" })).toBeNull();

		rerender(
			<SettingsPage
				account={
					<AccountSettingsSection
						email="yamada@example.com"
						signOut={<button type="button">ログアウト</button>}
						deletion={<p>削除の欄</p>}
					/>
				}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "アカウント" }),
		).toBeInTheDocument();
		expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "ログアウト" }),
		).toBeInTheDocument();
		expect(screen.getByText("削除の欄")).toBeInTheDocument();
	});
});
