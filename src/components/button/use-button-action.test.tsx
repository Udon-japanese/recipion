import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useButtonAction } from "./use-button-action";

function deferred() {
	let resolve: (value: unknown) => void = () => {};
	const promise = new Promise((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe("useButtonAction", () => {
	it("処理中 → 完了 と進む", async () => {
		const { result } = renderHook(() => useButtonAction());
		const gate = deferred();

		let done: Promise<void> = Promise.resolve();
		act(() => {
			done = result.current.run(() => gate.promise);
		});
		expect(result.current.status).toBe("pending");

		await act(async () => {
			gate.resolve(undefined);
			await done;
		});
		expect(result.current.status).toBe("success");
	});

	it("false を返す、または例外なら、失敗になる", async () => {
		const { result } = renderHook(() => useButtonAction());

		await act(async () => {
			await result.current.run(async () => false);
		});
		expect(result.current.status).toBe("error");

		await act(async () => {
			await result.current.run(async () => {
				throw new Error("失敗");
			});
		});
		expect(result.current.status).toBe("error");
	});

	it("処理中の再実行は、無視する（二重送信の防止）", async () => {
		const { result } = renderHook(() => useButtonAction());
		const gate = deferred();
		let calls = 0;
		const action = () => {
			calls += 1;
			return gate.promise;
		};

		let first: Promise<void> = Promise.resolve();
		act(() => {
			first = result.current.run(action);
			void result.current.run(action);
		});
		expect(calls).toBe(1);

		await act(async () => {
			gate.resolve(undefined);
			await first;
		});
	});
});
