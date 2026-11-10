import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "#/components/toast/toast-viewport";
import type { GuestShoppingMemoState } from "../infrastructure/dexie-guest-shopping-adoption";
import { GuestShoppingMemoAdoption } from "./guest-shopping-memo-adoption";

// 画面の上のお知らせ（showToast）を、見えるようにする。
beforeEach(() => {
	render(<ToastViewport />);
});

afterEach(cleanup);

const withMemo: GuestShoppingMemoState = {
	hasMemo: true,
	pendingItemCount: 2,
	hasPendingGuestPurchases: false,
};

function renderAdoption(ownerScope: "guest" | `user:${string}` = "user:a") {
	let push: (state: GuestShoppingMemoState) => void = () => {};
	const watchGuestMemo = vi.fn(
		(onChange: (state: GuestShoppingMemoState) => void) => {
			push = onChange;

			return () => {};
		},
	);
	const adoptGuestMemo = vi.fn(async () => ({
		items: [],
		stores: [],
		branches: [],
		storeDefaults: [],
		conversionMemories: [],
		itemMemories: [],
		mergedStoreCount: 0,
	}));

	render(
		<GuestShoppingMemoAdoption
			ownerScope={ownerScope}
			watchGuestMemo={watchGuestMemo}
			adoptGuestMemo={adoptGuestMemo}
		/>,
	);

	return {
		watchGuestMemo,
		adoptGuestMemo,
		push: (state: GuestShoppingMemoState) => act(() => push(state)),
	};
}

describe("GuestShoppingMemoAdoption", () => {
	it("ゲストのときは、見張らず、何も出さない", () => {
		const { watchGuestMemo } = renderAdoption("guest");

		expect(watchGuestMemo).not.toHaveBeenCalled();
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("ゲストの購入の送信待ちが片づくまでは聞かず、片づいたら聞いて、移す", async () => {
		const user = userEvent.setup();
		const { adoptGuestMemo, push } = renderAdoption();

		push({ ...withMemo, hasPendingGuestPurchases: true });

		expect(
			screen.queryByText("ログインする前の買い物メモを移しますか"),
		).toBeNull();

		push(withMemo);

		expect(
			screen.getByText(/まだ買っていない2件と、店・条件つきのメモ/u),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "移す" }));

		expect(adoptGuestMemo).toHaveBeenCalledWith("user:a");
		expect(
			await screen.findByText("ログインする前の買い物メモを移しました"),
		).toBeInTheDocument();
	});

	it("「今回は移さない」で閉じ、移さない", async () => {
		const user = userEvent.setup();
		const { adoptGuestMemo, push } = renderAdoption();

		push(withMemo);
		await user.click(screen.getByRole("button", { name: "今回は移さない" }));

		expect(adoptGuestMemo).not.toHaveBeenCalled();
		expect(
			screen.queryByText("ログインする前の買い物メモを移しますか"),
		).toBeNull();
	});
});
