import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "#/components/toast/toast-viewport";
import { GuestPurchaseAdoption } from "./guest-purchase-adoption";

// 画面の上のお知らせ（showToast）を、見えるようにする。
beforeEach(() => {
	render(<ToastViewport />);
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
				failures: [],
				stoppedBy: null,
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

	it("前に引き継いだことがある同じ人にも、毎回聞く", async () => {
		const user = userEvent.setup();
		const adoptGuestPurchases = vi.fn().mockResolvedValue({
			adoptedCount: 1,
			syncResult: { syncedCount: 1, failures: [], stoppedBy: null },
		});

		const { unmount } = render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(1)}
				adoptGuestPurchases={adoptGuestPurchases}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "在庫に入れる" }),
		);
		await screen.findByText("ログインする前に買ったものを在庫に入れました");
		unmount();

		// ログアウトして、また買ってから、同じ人がログインした。
		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={() => Promise.resolve(2)}
				adoptGuestPurchases={adoptGuestPurchases}
			/>,
		);

		expect(
			await screen.findByRole("alertdialog", {
				name: "ログインする前に買ったものを在庫に入れますか",
			}),
		).toBeInTheDocument();
		expect(adoptGuestPurchases).toHaveBeenCalledTimes(1);
	});
});
