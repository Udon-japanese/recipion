import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import type { InventoryListItem } from "../application/inventory-query-repository";
import { InventoryList } from "./inventory-list";

// 入れたもの（続けて追加したときの一覧）。
async function findAddedList() {
	return (await screen.findByText(/入れたもの/u)).closest("output");
}

afterEach(() => {
	localStorage.clear();
});

const egg = buildInventoryListItem({
	inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
	name: "卵",
	quantity: 6,
	lots: [
		{
			id: "lot-egg",
			quantity: 6,
			acquiredOn: "2026-10-01",
			storage: "fridge",
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
			createdAt: "2026-10-01T00:00:00.000Z",
		},
	],
});

function renderList(
	items: InventoryListItem[],
	registerInventoryItem: (input: unknown) => Promise<unknown>,
) {
	const loadInventoryItems = vi.fn(async () => ({
		items,
		source: "network" as const,
		cachedAt: "2026-10-14T00:00:00.000Z",
	}));

	render(
		<InventoryList
			ownerScope="user:user-id"
			loadInventoryItems={loadInventoryItems}
			registration={{
				registerInventoryItem,
				expiryEstimateLevel: "reliable",
			}}
		/>,
	);

	return { loadInventoryItems };
}

describe("在庫に追加するパネル", () => {
	it("在庫が空のときは、画面の中の「在庫に追加」だけを出す（右下の＋は出さない）", async () => {
		renderList([], vi.fn());

		expect(
			await screen.findByRole("button", { name: "在庫に追加" }),
		).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "在庫に追加" })).toHaveLength(
			1,
		);
	});

	it("登録しても閉じず、入力を空に戻し、入れたものを残して、在庫を読み直す", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});
		const { loadInventoryItems } = renderList([egg], registerInventoryItem);

		await user.click(
			(await screen.findAllByRole("button", { name: "在庫に追加" }))[0],
		);

		const dialog = await screen.findByRole("dialog", { name: "在庫に追加" });

		await user.type(screen.getByLabelText("食材名"), "薄力粉");
		await user.click(within(dialog).getByRole("button", { name: "追加" }));

		await waitFor(() => expect(registerInventoryItem).toHaveBeenCalled());
		expect(await findAddedList()).toHaveTextContent("薄力粉");
		expect(dialog).toBeInTheDocument();
		expect(screen.getByLabelText("食材名")).toHaveValue("");

		await waitFor(() => expect(loadInventoryItems).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(screen.getByLabelText("食材名")).toHaveFocus());
	});

	it("食材のパネルと追加のパネルは、どちらか一方だけが開く", async () => {
		const user = userEvent.setup();

		renderList([egg], vi.fn());

		await user.click(await screen.findByRole("button", { name: /^卵、/u }));
		expect(await screen.findByRole("dialog", { name: /卵/u })).toBeVisible();

		await user.click(screen.getAllByRole("button", { name: "在庫に追加" })[0]);
		expect(
			await screen.findByRole("dialog", { name: "在庫に追加" }),
		).toBeVisible();
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: /卵/u })).toBeNull(),
		);

		await user.click(screen.getByRole("button", { name: /^卵、/u }));
		expect(await screen.findByRole("dialog", { name: /卵/u })).toBeVisible();
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: "在庫に追加" })).toBeNull(),
		);
	});

	it("閉じても入力は残り、開き直すと戻る", async () => {
		const user = userEvent.setup();

		renderList([egg], vi.fn());

		await user.click(
			(await screen.findAllByRole("button", { name: "在庫に追加" }))[0],
		);
		await user.type(await screen.findByLabelText("食材名"), "ほうれん草");
		await user.keyboard("{Escape}");

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

		await user.click(screen.getAllByRole("button", { name: "在庫に追加" })[0]);

		expect(await screen.findByLabelText("食材名")).toHaveValue("ほうれん草");
	});

	it("閉じたあと、追加した食材のタイルに輪が出る", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({
			inventoryItem: { inventoryItemId: egg.inventoryItemId },
		});

		renderList([egg], registerInventoryItem);

		await user.click(
			(await screen.findAllByRole("button", { name: "在庫に追加" }))[0],
		);
		await user.type(await screen.findByLabelText("食材名"), "卵");
		await user.click(screen.getByRole("button", { name: "追加" }));
		await screen.findByText(/入れたもの/u);
		await user.keyboard("{Escape}");

		await waitFor(() =>
			expect(document.querySelector("[data-added]")).not.toBeNull(),
		);
	});
});
