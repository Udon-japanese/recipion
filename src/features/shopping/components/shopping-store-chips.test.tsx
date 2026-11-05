import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ShoppingStore } from "../domain/shopping-store";
import { ShoppingStoreChips } from "./shopping-store-chips";
import { ShoppingStoreSelect } from "./shopping-store-select";

const aeon: ShoppingStore = {
	id: "aeon",
	name: "イオン",
	sortOrder: 0,
	createdAt: "2026-10-01T00:00:00.000Z",
};

type User = ReturnType<typeof userEvent.setup>;
type Props = {
	onChange: (storeId: string | null) => void;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

// 店を足す欄は、チップ（追加のシート）と、選択（編集のシート）の2つ。同じ動きを確かめる。
describe.each([
	{
		title: "ShoppingStoreChips",
		renderStores: (props: Props) =>
			render(<ShoppingStoreChips stores={[]} value={null} {...props} />),
		startNewStore: (user: User) =>
			user.click(screen.getByRole("button", { name: /店を足す/u })),
	},
	{
		title: "ShoppingStoreSelect",
		renderStores: (props: Props) =>
			render(
				<>
					<label htmlFor="store">買う店</label>
					<ShoppingStoreSelect id="store" stores={[]} value={null} {...props} />
				</>,
			),
		startNewStore: (user: User) =>
			user.selectOptions(screen.getByLabelText("買う店"), "__new-store__"),
	},
])("$title：店を足す", ({ renderStores, startNewStore }) => {
	async function openNewStore(
		onCreateStore: (name: string) => Promise<ShoppingStore | null>,
	) {
		const user = userEvent.setup();
		const onChange = vi.fn();

		renderStores({ onChange, onCreateStore });
		await startNewStore(user);
		await user.type(screen.getByLabelText("新しい店の名前"), "イオン");

		return { user, onChange };
	}

	it("足せなかったら、ボタンで失敗を伝え、欄は開いたまま", async () => {
		const { user, onChange } = await openNewStore(async () => null);

		await user.click(screen.getByRole("button", { name: /この店を追加/u }));

		expect(
			await screen.findByText("失敗しました", { selector: "output" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("新しい店の名前")).toHaveValue("イオン");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("処理中に、もう一度押しても、足すのは1回だけ", async () => {
		let finish: (store: ShoppingStore) => void = () => {};
		const onCreateStore = vi.fn(
			() =>
				new Promise<ShoppingStore | null>((resolve) => {
					finish = resolve;
				}),
		);
		const { user, onChange } = await openNewStore(onCreateStore);
		const button = screen.getByRole("button", { name: /この店を追加/u });

		await user.click(button);
		await user.click(button);
		finish(aeon);

		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith("aeon"));
		expect(onCreateStore).toHaveBeenCalledTimes(1);
	});
});
