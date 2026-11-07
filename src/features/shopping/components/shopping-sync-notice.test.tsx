import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ShoppingSyncStatus } from "../infrastructure/shopping-sync-status";
import { ShoppingSyncNotice } from "./shopping-sync-notice";

function createStatusStore(initial: ShoppingSyncStatus) {
	let status = initial;
	const listeners = new Set<() => void>();

	return {
		getSnapshot: () => status,
		subscribe(listener: () => void) {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
		set(next: ShoppingSyncStatus) {
			status = next;
			for (const listener of listeners) listener();
		},
	};
}

const watchPending =
	(count: number) =>
	(_ownerScope: string, onChange: (count: number) => void) => {
		onChange(count);

		return () => {};
	};

afterEach(cleanup);

describe("ShoppingSyncNotice", () => {
	it("断られた変更があれば、件数を出し、送れたら消える", () => {
		const statusStore = createStatusStore({
			ownerScope: "user:user-1",
			isSyncing: false,
			failure: "rejected",
		});

		render(
			<ShoppingSyncNotice
				ownerScope="user:user-1"
				statusStore={statusStore}
				watchPending={watchPending(2)}
			/>,
		);

		expect(
			screen.getByText(
				"買い物メモの変更（2件）を、ほかの端末に反映できませんでした",
			),
		).toBeInTheDocument();

		act(() =>
			statusStore.set({
				ownerScope: "user:user-1",
				isSyncing: false,
				failure: null,
			}),
		);

		expect(screen.queryByText(/反映できませんでした/)).toBeNull();
	});

	it.each([
		["通信がない", "offline"],
		["サーバーの一時的な障害", "server"],
		["ログインが切れた", "account"],
	] as const)("%sときは、出さない（黙って送り直す）", (_label, failure) => {
		const { container } = render(
			<ShoppingSyncNotice
				ownerScope="user:user-1"
				statusStore={createStatusStore({
					ownerScope: "user:user-1",
					isSyncing: false,
					failure,
				})}
				watchPending={watchPending(2)}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("送れていない変更がなければ、断られていても出さない", () => {
		const { container } = render(
			<ShoppingSyncNotice
				ownerScope="user:user-1"
				statusStore={createStatusStore({
					ownerScope: "user:user-1",
					isSyncing: false,
					failure: "rejected",
				})}
				watchPending={watchPending(0)}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
