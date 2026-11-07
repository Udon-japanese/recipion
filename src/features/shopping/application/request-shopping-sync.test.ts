import { describe, expect, it, vi } from "vitest";
import { createShoppingSyncRequester } from "./request-shopping-sync";

const user = "user:user-1" as const;

// 1回の同期を、テストの中で終わらせられるようにする。
function createControlledSync() {
	const finishers: ((error?: unknown) => void)[] = [];
	const syncOnce = vi.fn(
		() =>
			new Promise<void>((resolve, reject) => {
				finishers.push((error) => (error ? reject(error) : resolve()));
			}),
	);

	return {
		syncOnce,
		finish: async (index: number, error?: unknown) => {
			finishers[index]?.(error);
			await new Promise((resolve) => setTimeout(resolve, 0));
		},
	};
}

describe("createShoppingSyncRequester", () => {
	it("同期の最中に書いた依頼は、終わったあとに、もう1回同期する", async () => {
		const { syncOnce, finish } = createControlledSync();
		const request = createShoppingSyncRequester({
			syncOnce,
			classify: () => "offline",
		});

		const first = request(user, "wake");

		request(user, "write");
		request(user, "write");
		await finish(0);

		expect(syncOnce).toHaveBeenCalledTimes(2);

		await finish(1);

		await expect(first).resolves.toBeNull();
		expect(syncOnce).toHaveBeenCalledTimes(2);
	});

	it("同期の最中の focus・visibilitychange などの依頼は、その同期にまとめる（もう1回はしない）", async () => {
		const { syncOnce, finish } = createControlledSync();
		const request = createShoppingSyncRequester({
			syncOnce,
			classify: () => "offline",
		});

		request(user, "wake");
		request(user, "wake");
		request(user, "wake");
		await finish(0);

		expect(syncOnce).toHaveBeenCalledTimes(1);
	});

	it("同期が終わったあとの依頼は、新しい同期になる（終わり際の依頼を落とさない）", async () => {
		const { syncOnce, finish } = createControlledSync();
		const onSettled = vi.fn();
		const request = createShoppingSyncRequester({
			syncOnce,
			classify: () => "offline",
			// 終わったと知らされた時点で、もう次の依頼を受け付けている。
			onSettled: (ownerScope) => {
				onSettled();
				request(ownerScope, "write");
			},
		});

		request(user, "write");
		await finish(0);

		expect(onSettled).toHaveBeenCalledTimes(1);
		expect(syncOnce).toHaveBeenCalledTimes(2);
	});

	it("失敗したら、失敗の種類を返し、もう1回はしない（送り直すかは、呼び出す側が決める）", async () => {
		const { syncOnce, finish } = createControlledSync();
		const request = createShoppingSyncRequester({
			syncOnce,
			classify: () => "server",
		});

		const result = request(user, "write");

		request(user, "write");
		await finish(0, new Error("失敗"));

		await expect(result).resolves.toBe("server");
		expect(syncOnce).toHaveBeenCalledTimes(1);
	});
});
