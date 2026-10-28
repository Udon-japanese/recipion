import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CreateShoppingItemInput } from "../domain/shopping-item";
import { ShoppingAddSheet } from "./shopping-add-sheet";

const stores = [
	{
		id: "aeon",
		name: "イオン",
		sortOrder: 0,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
	{
		id: "gyomu",
		name: "業務スーパー",
		sortOrder: 1,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
];

function setup() {
	const onAdd = vi.fn(async (_input: CreateShoppingItemInput) => true);
	const onClose = vi.fn();

	render(
		<ShoppingAddSheet
			title="買うものを入れる"
			stores={stores}
			defaultStoreIdFor={() => null}
			onCreateStore={async () => null}
			onAdd={onAdd}
			onClose={onClose}
		/>,
	);

	return { onAdd, onClose };
}

describe("ShoppingAddSheet", () => {
	it("開くと、名前の欄にすぐ打てる", () => {
		setup();

		expect(screen.getByLabelText("買うもの")).toHaveFocus();
	});

	it("Enter で追加でき、入力は空に戻るが、店は前回のまま続く", async () => {
		const user = userEvent.setup();
		const { onAdd } = setup();

		await user.click(screen.getByRole("button", { name: "業務スーパー" }));
		await user.type(screen.getByLabelText("買うもの"), "牛乳{Enter}");

		expect(onAdd).toHaveBeenCalledWith(
			expect.objectContaining({ name: "牛乳", storeId: "gyomu" }),
		);
		expect(await screen.findByText(/牛乳 1/)).toBeInTheDocument();
		expect(screen.getByLabelText("買うもの")).toHaveValue("");

		await user.type(screen.getByLabelText("買うもの"), "卵");

		expect(
			screen.getByRole("button", { name: "業務スーパー" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("名前を打ちかけているときは、Esc で閉じない（空なら閉じる）", async () => {
		const user = userEvent.setup();
		const { onClose } = setup();

		await user.type(screen.getByLabelText("買うもの"), "牛");
		await user.keyboard("{Escape}");

		expect(onClose).not.toHaveBeenCalled();

		await user.clear(screen.getByLabelText("買うもの"));
		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
