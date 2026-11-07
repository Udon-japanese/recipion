import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestFailureKind } from "#/errors/classify-request-error";
import { signedInOwnerStorage } from "../infrastructure/signed-in-owner-storage";
import {
	ShoppingSyncRunner,
	shoppingSyncRetryDelaysMs,
} from "./shopping-sync-runner";

const mocks = vi.hoisted(() => ({
	session: {
		data: null as null | { user: { id: string } },
		isPending: false,
		isUnconfirmed: false,
	},
}));

vi.mock("#/integrations/better-auth/use-app-session", () => ({
	useAppSession: () => mocks.session,
}));

const signedIn = {
	data: { user: { id: "user-1" } },
	isPending: false,
	isUnconfirmed: false,
};

function renderRunner(failures: (RequestFailureKind | null)[] = []) {
	// 失敗の種類を、呼ばれた順に返す（尽きたら成功）。
	const sync = vi.fn(async () => failures.shift() ?? null);
	const markWaiting = vi.fn();
	let notifyPending: (count: number) => void = () => {};
	const watchPending = vi.fn(
		(_ownerScope: string, onChange: (count: number) => void) => {
			notifyPending = onChange;

			return () => {};
		},
	);

	render(
		<ShoppingSyncRunner
			sync={sync}
			markWaiting={markWaiting}
			watchPending={watchPending}
		/>,
	);

	return {
		sync,
		markWaiting,
		notifyPending: (count: number) => act(() => notifyPending(count)),
	};
}

// 同期の結果（Promise）を受け取らせる。
async function settle() {
	await act(async () => {
		await Promise.resolve();
	});
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	localStorage.clear();
	mocks.session = { data: null, isPending: false, isUnconfirmed: false };
});

describe("ShoppingSyncRunner", () => {
	it("ログインしていれば、開いたときと、書いたとき（待たずに）に同期する", () => {
		mocks.session = signedIn;
		const { sync, notifyPending } = renderRunner();

		expect(sync).toHaveBeenCalledTimes(1);
		expect(sync).toHaveBeenCalledWith("user:user-1", "wake");

		notifyPending(1);
		expect(sync).toHaveBeenCalledTimes(2);
		expect(sync).toHaveBeenLastCalledWith("user:user-1", "write");

		// 送り終えて、印がなくなったときは、同期しない。
		notifyPending(0);
		expect(sync).toHaveBeenCalledTimes(2);
	});

	it.each([
		["ウィンドウに戻ったとき", () => window.dispatchEvent(new Event("focus"))],
		["通信が戻ったとき", () => window.dispatchEvent(new Event("online"))],
		[
			"画面が隠れる・見えるとき",
			() => document.dispatchEvent(new Event("visibilitychange")),
		],
	])("%sに、同期する（書いたことによる依頼ではない）", (_label, dispatch) => {
		mocks.session = signedIn;
		const { sync } = renderRunner();

		act(dispatch);

		expect(sync).toHaveBeenCalledTimes(2);
		expect(sync).toHaveBeenLastCalledWith("user:user-1", "wake");
	});

	it("一定の間隔では、同期しない（変わっていなくても DB に問い合わせない）", () => {
		mocks.session = signedIn;
		const { sync } = renderRunner();

		act(() => vi.advanceTimersByTime(60 * 60 * 1000));

		expect(sync).toHaveBeenCalledTimes(1);
	});

	it("ログイン状態の取り直しに失敗していても、手元のセッションが同じ人なら同期する（本人かは、サーバーが確かめる）", () => {
		mocks.session = { ...signedIn, isUnconfirmed: true };
		const { sync } = renderRunner();

		expect(sync).toHaveBeenCalledWith("user:user-1", "wake");
	});

	it("手元にセッションがなく、覚えている人だけのときは、同期せず、待っている状態にする", () => {
		signedInOwnerStorage.write("user:user-1");
		mocks.session = { data: null, isPending: false, isUnconfirmed: true };
		const { sync, markWaiting } = renderRunner();

		expect(sync).not.toHaveBeenCalled();
		expect(markWaiting).toHaveBeenCalledWith("user:user-1");
	});

	it("ゲストでは、何もしない", () => {
		const { sync, markWaiting } = renderRunner();

		expect(sync).not.toHaveBeenCalled();
		expect(markWaiting).not.toHaveBeenCalled();
	});

	describe("失敗したときの送り直し", () => {
		it("まだ送っていない変更があり、通信の失敗なら、間隔をあけて送り直し、成功したら止める", async () => {
			mocks.session = signedIn;
			const { sync, notifyPending } = renderRunner([null, "offline", "server"]);

			notifyPending(2);
			await settle();
			expect(sync).toHaveBeenCalledTimes(2);

			act(() => vi.advanceTimersByTime(shoppingSyncRetryDelaysMs[0] ?? 0));
			await settle();
			expect(sync).toHaveBeenCalledTimes(3);

			act(() => vi.advanceTimersByTime(shoppingSyncRetryDelaysMs[1] ?? 0));
			await settle();
			expect(sync).toHaveBeenCalledTimes(4);

			// 4回目は成功したので、もう送り直さない。
			act(() => vi.advanceTimersByTime(60 * 60 * 1000));
			await settle();
			expect(sync).toHaveBeenCalledTimes(4);
		});

		it.each([
			["ログインが切れた・別のアカウント", "account"],
			["内容で断られた", "rejected"],
		] as const)("%sときは、送り直さない", async (_label, failure) => {
			mocks.session = signedIn;
			const { sync, notifyPending } = renderRunner([null, failure]);

			notifyPending(1);
			await settle();
			act(() => vi.advanceTimersByTime(60 * 60 * 1000));
			await settle();

			expect(sync).toHaveBeenCalledTimes(2);
		});

		it("まだ送っていない変更がなければ、通信が失敗しても送り直さない", async () => {
			mocks.session = signedIn;
			const { sync } = renderRunner(["offline"]);

			await settle();
			act(() => vi.advanceTimersByTime(60 * 60 * 1000));
			await settle();

			expect(sync).toHaveBeenCalledTimes(1);
		});
	});
});
