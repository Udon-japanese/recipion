import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { readExpiryEstimateLevel } from "#/features/inventory/infrastructure/expiry-estimate-level-storage";
import { standInModeItem } from "#/features/recipes/infrastructure/stand-in-mode-storage";
import { AccountSettingsSection } from "./account-settings-section";
import { SettingsPage, type SettingsTab } from "./settings-page";

afterEach(() => {
	localStorage.clear();
});

function TestSettingsPage({
	initialTab = "inventory",
	loggedIn = false,
}: {
	initialTab?: SettingsTab;
	loggedIn?: boolean;
}) {
	const [tab, setTab] = useState<SettingsTab>(initialTab);

	return (
		<SettingsPage
			tab={tab}
			onTabChange={setTab}
			data={<p>データの欄</p>}
			account={
				loggedIn ? (
					<AccountSettingsSection
						email="yamada@example.com"
						signOut={<button type="button">ログアウト</button>}
						deletion={<p>削除の欄</p>}
					/>
				) : undefined
			}
		/>
	);
}

describe("SettingsPage", () => {
	it("期限の目安の自動入力は、初期値が「確実なものだけ」で、選び直すと、この端末に保存する", async () => {
		const user = userEvent.setup();

		render(<TestSettingsPage />);

		expect(
			screen.getByRole("radio", { name: /確実なものだけ/u }),
		).toBeChecked();

		await user.click(screen.getByRole("radio", { name: /すべて/u }));

		expect(screen.getByRole("radio", { name: /すべて/u })).toBeChecked();
		expect(readExpiryEstimateLevel(localStorage)).toBe("all");
	});

	it("冷凍野菜の代わりは、初期値が「自動で使う」で、選び直すと、この端末に保存する", async () => {
		const user = userEvent.setup();

		render(<TestSettingsPage />);

		expect(screen.getByRole("radio", { name: /自動で使う/u })).toBeChecked();

		await user.click(screen.getByRole("radio", { name: /^毎回選ぶ$/u }));

		expect(screen.getByRole("radio", { name: /^毎回選ぶ$/u })).toBeChecked();
		expect(standInModeItem.read(localStorage)).toBe("ask");
	});

	it("タブで欄を切り替える（押す・矢印キー・Home/End）", async () => {
		const user = userEvent.setup();

		render(<TestSettingsPage loggedIn />);

		await user.click(screen.getByRole("tab", { name: "データ" }));

		expect(screen.getByRole("tab", { name: "データ" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("tabpanel")).toHaveTextContent("データの欄");

		await user.keyboard("{ArrowRight}");

		expect(screen.getByRole("tab", { name: "アカウント" })).toHaveFocus();
		expect(screen.getByText("yamada@example.com")).toBeInTheDocument();

		await user.keyboard("{ArrowDown}");

		expect(screen.getByRole("tab", { name: "在庫" })).toHaveFocus();
		expect(screen.getByRole("heading", { name: "在庫" })).toBeInTheDocument();

		await user.keyboard("{End}");

		expect(screen.getByRole("tab", { name: "アカウント" })).toHaveFocus();

		await user.keyboard("{Home}");

		expect(screen.getByRole("tab", { name: "在庫" })).toHaveFocus();
	});

	it("ログインしていないときは、アカウントのタブを出さず、開こうとしても在庫を出す", () => {
		render(<TestSettingsPage initialTab="account" />);

		expect(screen.queryByRole("tab", { name: "アカウント" })).toBeNull();
		expect(screen.getByRole("tab", { name: "在庫" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.queryByText("yamada@example.com")).toBeNull();
	});
});
