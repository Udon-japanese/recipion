import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SyncInventoryPurchaseOutboxResult } from "../application/sync-inventory-purchase-outbox";
import { InventoryPurchaseSync } from "./inventory-purchase-sync";

function synced(count: number): SyncInventoryPurchaseOutboxResult {
	return { syncedCount: count, failures: [], stoppedBy: null };
}

describe("InventoryPurchaseSync", () => {
	it("ログイン済みなら表示時に未送信在庫を同期する", async () => {
		const syncPurchases = vi.fn().mockResolvedValue(synced(2));

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

	it("送る購入がなければ、送らず、「同期しています」も出さない（画面に戻るたびに、一瞬出ない）", async () => {
		const syncPurchases = vi.fn().mockResolvedValue(synced(0));
		const countPending = vi.fn().mockResolvedValue(0);

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
				countPending={countPending}
			/>,
		);

		expect(screen.queryByText("在庫を同期しています…")).toBeNull();
		await waitFor(() => {
			expect(countPending).toHaveBeenCalledWith("user:user-id");
		});

		document.dispatchEvent(new Event("visibilitychange"));

		await waitFor(() => {
			expect(countPending).toHaveBeenCalledTimes(2);
		});
		expect(screen.queryByText("在庫を同期しています…")).toBeNull();
		expect(syncPurchases).not.toHaveBeenCalled();
	});

	it("送る購入があれば、送る", async () => {
		const syncPurchases = vi.fn().mockResolvedValue(synced(1));

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
				countPending={() => Promise.resolve(1)}
			/>,
		);

		expect(
			await screen.findByText("1件の在庫を反映しました"),
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

	// 送れなかった理由ごとに、次に何が起きるかを伝える。
	it.each([
		{
			label: "届かない",
			result: { syncedCount: 0, failures: [], stoppedBy: "offline" },
			text: /通信できないため、買ったものを在庫に入れていません/,
		},
		{
			label: "ログインの状態",
			result: { syncedCount: 0, failures: [], stoppedBy: "account" },
			text: /ログインの状態を確かめられないため/,
		},
		{
			label: "サーバーの中の失敗",
			result: {
				syncedCount: 0,
				failures: [
					{
						entryId: "entry-id",
						ingredientName: "卵",
						kind: "server",
						message: "うまく処理できませんでした",
					},
				],
				stoppedBy: null,
			},
			text: /1件の買ったものを、サーバーで在庫に入れられませんでした/,
		},
		{
			label: "内容で断られた",
			result: {
				syncedCount: 0,
				failures: [
					{
						entryId: "entry-id",
						ingredientName: "卵",
						kind: "rejected",
						message: "在庫の単位に換算できません",
					},
				],
				stoppedBy: null,
			},
			text: "卵を在庫に入れられません：在庫の単位に換算できません",
		},
	] satisfies {
		label: string;
		result: SyncInventoryPurchaseOutboxResult;
		text: RegExp | string;
	}[])("送れなかった理由が「$label」", async ({ result, text }) => {
		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={vi.fn().mockResolvedValue(result)}
			/>,
		);

		expect(await screen.findByText(text)).toBeInTheDocument();
	});

	it("同期失敗後に手動で再試行できる", async () => {
		const user = userEvent.setup();

		const syncPurchases = vi
			.fn()
			.mockResolvedValueOnce({
				syncedCount: 0,
				failures: [],
				stoppedBy: "offline",
			} satisfies SyncInventoryPurchaseOutboxResult)
			.mockResolvedValueOnce(synced(1));

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

	it("内容で断られた購入は、確かめてから、在庫に入れずに消せる", async () => {
		const user = userEvent.setup();
		const discardPurchase = vi.fn().mockResolvedValue(undefined);
		const syncPurchases = vi
			.fn()
			.mockResolvedValueOnce({
				syncedCount: 0,
				failures: [
					{
						entryId: "entry-id",
						ingredientName: "卵",
						kind: "rejected",
						message: "在庫の単位に換算できません",
					},
				],
				stoppedBy: null,
			} satisfies SyncInventoryPurchaseOutboxResult)
			.mockResolvedValue(synced(0));

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
				discardPurchase={discardPurchase}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "在庫に入れない" }),
		);

		expect(discardPurchase).not.toHaveBeenCalled();

		await user.click(await screen.findByRole("button", { name: "消す" }));

		await waitFor(() => {
			expect(discardPurchase).toHaveBeenCalledWith("entry-id");
		});
		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledTimes(2);
		});
	});

	it("オンライン復帰通知で再同期する", async () => {
		const syncPurchases = vi.fn().mockResolvedValue(synced(0));

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

	it("画面に戻ったとき（スリープからの復帰も）に再同期する", async () => {
		const syncPurchases = vi.fn().mockResolvedValue(synced(0));

		render(
			<InventoryPurchaseSync
				ownerScope="user:user-id"
				syncPurchases={syncPurchases}
			/>,
		);

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledTimes(1);
		});

		document.dispatchEvent(new Event("visibilitychange"));

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledTimes(2);
		});
	});

	it("送っている間に別の人に変わったら、前の人の結果を出さない", async () => {
		let resolveFirst: (result: SyncInventoryPurchaseOutboxResult) => void =
			() => {};
		const syncPurchases = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<SyncInventoryPurchaseOutboxResult>((resolve) => {
						resolveFirst = resolve;
					}),
			)
			.mockResolvedValue(synced(0));

		const { rerender } = render(
			<InventoryPurchaseSync
				ownerScope="user:first"
				syncPurchases={syncPurchases}
			/>,
		);

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledWith("user:first");
		});

		rerender(
			<InventoryPurchaseSync
				ownerScope="user:second"
				syncPurchases={syncPurchases}
			/>,
		);

		await waitFor(() => {
			expect(syncPurchases).toHaveBeenCalledWith("user:second");
		});

		resolveFirst(synced(3));

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(
			screen.queryByText("3件の在庫を反映しました"),
		).not.toBeInTheDocument();
	});
});
