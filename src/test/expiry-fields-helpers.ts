import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect } from "vitest";

type User = ReturnType<typeof userEvent.setup>;

// 保存方法・期限の種類の、たたんだ行（在庫に追加では、数え方も一緒）。
function getDetailsToggle() {
	return screen.getByRole("button", { name: /^保存方法・期限/u });
}

// 保存方法・期限の種類は、たたまれているので、閉じていれば、開いてから探す。
export async function openExpiryDetails(user: User) {
	const toggle = getDetailsToggle();

	if (toggle.getAttribute("aria-expanded") === "false") {
		await user.click(toggle);
	}
}

async function getGroup(user: User, name: "期限の種類" | "保存方法") {
	await openExpiryDetails(user);

	return within(await screen.findByRole("group", { name }));
}

// 期限の入力欄（ExpiryFields）の、期限の種類を選ぶ。
export async function chooseExpiryKind(user: User, label: string) {
	await user.click(
		(await getGroup(user, "期限の種類")).getByRole("button", { name: label }),
	);
}

// 期限の入力欄の、保存方法を選ぶ。
export async function chooseExpiryStorage(user: User, label: string) {
	await user.click(
		(await getGroup(user, "保存方法")).getByRole("button", { name: label }),
	);
}

// 期限の種類が、選ばれているか（たたんだ行の要約で確かめる）。
export function expectExpiryKind(label: string) {
	expect(getDetailsToggle()).toHaveTextContent(label);
}
