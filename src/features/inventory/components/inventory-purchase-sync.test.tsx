import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InventoryPurchaseSync } from "./inventory-purchase-sync";

describe("InventoryPurchaseSync", () => {
	it("ログイン済みなら表示時に未送信在庫を同期する", async () => {
		const syncPurchases = vi.fn().mockResolvedValue({
			syncedCount: 2,
			failedEntryId: null,
		});

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
			/>,
		);

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledWith("user:user-id");
		});

		expect(
			await screen.findByText("2件の在庫を反映しました"),
		).toBeInTheDocument();
	});

	it("ゲストのoutboxは自動同期しない", () => {
		const syncPurchases = vi.fn();

		render(
			<InventoryPurchaseSync
				ownerScope="guest"
				syncPurchases={syncPurchases}
			/>,
		);

		expect(syncPurchases).not.toHaveBeenCalled();
	});

	it("同期失敗後に手動で再試行できる", async () => {
		const user = userEvent.setup();

		const syncPurchases = vi
			.fn()
			.mockResolvedValueOnce({
				syncedCount: 0,
				failedEntryId: "entry-id",
			})
			.mockResolvedValueOnce({
				syncedCount: 1,
				failedEntryId: null,
			});

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", {
				name: "在庫同期を再試行",
			}),
		);

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledTimes(2);
		});

		expect(
			await screen.findByText("1件の在庫を反映しました"),
		).toBeInTheDocument();
	});

	it("オンライン復帰通知で再同期する", async () => {
		const syncPurchases = vi.fn().mockResolvedValue({
			syncedCount: 0,
			failedEntryId: null,
		});

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
			/>,
		);

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledTimes(1);
		});

		window.dispatchEvent(new Event("online"));

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledTimes(2);
		});
	});
});
