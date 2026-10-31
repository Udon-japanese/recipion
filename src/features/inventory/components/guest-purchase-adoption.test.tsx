import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { LastOwnerMemory } from "../infrastructure/last-owner-storage";
import { GuestPurchaseAdoption } from "./guest-purchase-adoption";

// 覚えておく場所の、テスト用（端末の保存には、書かない）。
function createMemory(initial: InventoryPurchaseOwnerScope | null = null) {
	let value = initial;
	const memory: LastOwnerMemory = {
		get: () => value,
		set: (next) => {
			value = next;
		},
	};

	return { memory, read: () => value };
}

// 覚えておく人は、端末の保存（localStorage）に残る。テストの間に、持ち越さない。
afterEach(() => {
	localStorage.clear();
});

describe("GuestPurchaseAdoption", () => {
	it("ログインする前の購入があれば、ログイン後に確認する", async () => {
		const loadGuestPurchaseCount = vi.fn().mockResolvedValue(2);

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={loadGuestPurchaseCount}
				adoptGuestPurchases={vi.fn()}
			/>,
		);

		expect(
			await screen.findByRole("alertdialog", {
				name: "ログインする前に買ったものを在庫に入れますか",
			}),
		).toBeInTheDocument();

		expect(screen.getByText(/買ったもの（2件）を/)).toBeInTheDocument();
	});

	it("確認後にゲスト購入を引き継ぐ", async () => {
		const user = userEvent.setup();

		const adoptGuestPurchases = vi.fn().mockResolvedValue({
			adoptedCount: 2,
			syncResult: {
				syncedCount: 2,
				failedEntryId: null,
			},
		});

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(2)}
				adoptGuestPurchases={adoptGuestPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "在庫に入れる" }),
		);

		expect(adoptGuestPurchases).toHaveBeenCalledWith("user:user-id");

		// 質問のシートは閉じて、結果は、Note で出る。
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(
			await screen.findByText("ログインする前に買ったものを在庫に入れました"),
		).toBeInTheDocument();
	});

	it("「今回は入れない」を選べる", async () => {
		const user = userEvent.setup();
		const adoptGuestPurchases = vi.fn();

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(1)}
				adoptGuestPurchases={adoptGuestPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "今回は入れない" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).toBeNull();
		});

		expect(adoptGuestPurchases).not.toHaveBeenCalled();
	});

	it("ゲスト状態では確認しない", () => {
		const loadGuestPurchaseCount = vi.fn();

		render(
			<GuestPurchaseAdoption
				ownerScope="guest"
				loadGuestPurchaseCount={loadGuestPurchaseCount}
				adoptGuestPurchases={vi.fn()}
			/>,
		);

		expect(loadGuestPurchaseCount).not.toHaveBeenCalled();
	});

	it("初めてログインした人には、聞く（覚えている人がいない）", async () => {
		const adoptGuestPurchases = vi.fn();
		const { memory } = createMemory(null);

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(2)}
				adoptGuestPurchases={adoptGuestPurchases}
				lastOwnerMemory={memory}
			/>,
		);

		expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
		expect(adoptGuestPurchases).not.toHaveBeenCalled();
	});

	it("別の人が使っていた端末では、聞く", async () => {
		const adoptGuestPurchases = vi.fn();
		const { memory } = createMemory("user:other-user");

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(2)}
				adoptGuestPurchases={adoptGuestPurchases}
				lastOwnerMemory={memory}
			/>,
		);

		expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
		expect(adoptGuestPurchases).not.toHaveBeenCalled();
	});

	it("前にも、この端末を使った同じ人には、聞かずに引き継ぐ", async () => {
		const adoptGuestPurchases = vi.fn().mockResolvedValue({
			adoptedCount: 2,
			syncResult: { syncedCount: 2, failedEntryId: null },
		});
		const { memory } = createMemory("user:user-id");

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(2)}
				adoptGuestPurchases={adoptGuestPurchases}
				lastOwnerMemory={memory}
			/>,
		);

		expect(
			await screen.findByText("ログインする前に買ったものを在庫に入れました"),
		).toBeInTheDocument();
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(adoptGuestPurchases).toHaveBeenCalledWith("user:user-id");
	});

	it("引き継いだら、その人を覚える。「今回は入れない」では、覚えない", async () => {
		const user = userEvent.setup();
		const declined = createMemory(null);

		const { unmount } = render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(1)}
				adoptGuestPurchases={vi.fn()}
				lastOwnerMemory={declined.memory}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "今回は入れない" }),
		);
		expect(declined.read()).toBeNull();

		unmount();

		const adopted = createMemory(null);

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(1)}
				adoptGuestPurchases={vi.fn().mockResolvedValue({
					adoptedCount: 1,
					syncResult: { syncedCount: 1, failedEntryId: null },
				})}
				lastOwnerMemory={adopted.memory}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "在庫に入れる" }),
		);
		await screen.findByText("ログインする前に買ったものを在庫に入れました");
		expect(adopted.read()).toBe("user:user-id");
	});

	it("引き継ぐものがないときも、その人を覚える", async () => {
		const { memory, read } = createMemory(null);

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(0)}
				adoptGuestPurchases={vi.fn()}
				lastOwnerMemory={memory}
			/>,
		);

		await waitFor(() => expect(read()).toBe("user:user-id"));
	});
});
