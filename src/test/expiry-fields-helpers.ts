import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect } from "vitest";

type User = ReturnType<typeof userEvent.setup>;

// 保存方法・期限の種類は、たたまれていることがあるので、閉じていれば、開いてから探す。
async function openDetails(user: User) {
	const toggle = screen.getByRole("button", { name: /保存方法・期限の種類/u });

	if (toggle.getAttribute("aria-expanded") === "false") {
		await user.click(toggle);
	}
}

async function getGroup(user: User, name: "期限の種類" | "保存方法") {
	await openDetails(user);

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

// 期限の種類が、選ばれているか。
export function expectExpiryKind(label: string) {
	// 種類が選ばれているときは、自動で開いている。
	expect(
		within(screen.getByRole("group", { name: "期限の種類" })).getByRole(
			"button",
			{ name: label },
		),
	).toHaveAttribute("aria-pressed", "true");
}
