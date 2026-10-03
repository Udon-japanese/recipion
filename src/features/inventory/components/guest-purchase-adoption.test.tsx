import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuestPurchaseAdoption } from "./guest-purchase-adoption";

describe("GuestPurchaseAdoption", () => {
	it("ゲスト購入があればログイン後に確認する", async () => {
		const loadGuestPurchaseCount = vi.fn().mockResolvedValue(2);

		render(
			<GuestPurchaseAdoption
				ownerScope="user:user-id"
				loadGuestPurchaseCount={loadGuestPurchaseCount}
				adoptGuestPurchases={vi.fn()}
			/>,
		);

		expect(
			await screen.findByText("ゲスト購入を引き継ぎますか？"),
		).toBeInTheDocument();

		expect(screen.getByText(/未反映の購入が2件あります/)).toBeInTheDocument();
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
			await screen.findByRole("button", {
				name: "このアカウントへ引き継ぐ",
			}),
		);

		expect(adoptGuestPurchases).toHaveBeenCalledWith("user:user-id");

		expect(
			await screen.findByText("ゲスト購入を引き継ぎ、在庫へ反映しました"),
		).toBeInTheDocument();
	});

	it("今回は引き継がないを選べる", async () => {
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
			await screen.findByRole("button", {
				name: "今回は引き継がない",
			}),
		);

		await waitFor(() => {
			expect(
				screen.queryByText("ゲスト購入を引き継ぎますか？"),
			).not.toBeInTheDocument();
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
});
