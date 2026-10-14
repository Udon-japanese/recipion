import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect } from "vitest";

type User = ReturnType<typeof userEvent.setup>;

function getGroup(name: "期限の種類" | "保存方法") {
	return within(screen.getByRole("group", { name }));
}

// 期限の入力欄（ExpiryFields）の、期限の種類を選ぶ。
export async function chooseExpiryKind(user: User, label: string) {
	await user.click(getGroup("期限の種類").getByRole("button", { name: label }));
}

// 期限の入力欄の、保存方法を選ぶ。
export async function chooseExpiryStorage(user: User, label: string) {
	await user.click(getGroup("保存方法").getByRole("button", { name: label }));
}

// 期限の種類が、選ばれているか。
export function expectExpiryKind(label: string) {
	expect(
		getGroup("期限の種類").getByRole("button", { name: label }),
	).toHaveAttribute("aria-pressed", "true");
}
