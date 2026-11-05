import { describe, expect, it, vi } from "vitest";
import {
	notifyPurchaseSyncStarted,
	purchaseSyncChannelName,
	subscribePurchaseSyncStarted,
} from "./purchase-sync-events";

describe("在庫へ送り始めたことの知らせ", () => {
	it("同じタブで送り始めたら、すぐに届く", () => {
		const listener = vi.fn();
		const unsubscribe = subscribePurchaseSyncStarted(listener);

		notifyPurchaseSyncStarted();

		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("別のタブで送り始めても、届く", async () => {
		const listener = vi.fn();
		const unsubscribe = subscribePurchaseSyncStarted(listener);
		// 別のタブの代わり（同じ名前の、別の BroadcastChannel）。
		const otherTab = new BroadcastChannel(purchaseSyncChannelName);

		otherTab.postMessage("started");

		await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
		otherTab.close();
		unsubscribe();
	});

	it("このタブで送り始めたら、別のタブにも知らせる", async () => {
		const otherTab = new BroadcastChannel(purchaseSyncChannelName);
		const received = vi.fn();

		otherTab.onmessage = received;
		notifyPurchaseSyncStarted();

		await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
		otherTab.close();
	});

	it("やめたあとは、届かない", () => {
		const listener = vi.fn();

		subscribePurchaseSyncStarted(listener)();
		notifyPurchaseSyncStarted();

		expect(listener).not.toHaveBeenCalled();
	});
});
