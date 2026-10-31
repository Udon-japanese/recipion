import { useState } from "react";
import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../styles.css";
import { DateField } from "./date-picker";

function Harness({ top }: { top: number }) {
	const [value, setValue] = useState("");

	return (
		<div style={{ position: "absolute", top, left: 40, width: 320 }}>
			<DateField
				aria-label="期限"
				value={value}
				today="2026-10-31"
				onChange={setValue}
			/>
		</div>
	);
}

// 実際の画面（Chromium）で、カレンダーが、画面の中に収まることと、下が狭いときは、欄の上に出ることを確かめる。
// 幅 768px 以上（PC の作り）で確かめる。
async function openOnDesktop(top: number) {
	await page.viewport(1024, 800);
	render(<Harness top={top} />);
	await page.getByRole("button", { name: "カレンダーを開く" }).click();
}

it("欄の下に空きがあるときは、下に出て、画面の中に収まる", async () => {
	await openOnDesktop(20);

	const dialog = page.getByRole("dialog", { name: "カレンダー" });
	await expect.element(dialog).toBeVisible();

	const rect = dialog.element().getBoundingClientRect();
	const input = page.getByLabelText("期限").element().getBoundingClientRect();

	expect(rect.top).toBeGreaterThanOrEqual(input.bottom);
	expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
	expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
});

it("欄の下に空きがないときは、欄の上に出る", async () => {
	await openOnDesktop(730);

	const dialog = page.getByRole("dialog", { name: "カレンダー" });
	await expect.element(dialog).toBeVisible();

	const rect = dialog.element().getBoundingClientRect();
	const input = page.getByLabelText("期限").element().getBoundingClientRect();

	expect(rect.bottom).toBeLessThanOrEqual(input.top);
	expect(rect.top).toBeGreaterThanOrEqual(0);
});

it("画面が低くて、入り切らないときも、画面の外へ、はみ出さない", async () => {
	await page.viewport(1024, 360);
	render(<Harness top={150} />);
	await page.getByRole("button", { name: "カレンダーを開く" }).click();

	const dialog = page.getByRole("dialog", { name: "カレンダー" });
	await expect.element(dialog).toBeVisible();

	const rect = dialog.element().getBoundingClientRect();

	expect(rect.top).toBeGreaterThanOrEqual(0);
	expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
});
