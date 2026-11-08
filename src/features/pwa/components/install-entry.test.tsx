import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetStorageItemsForTest } from "#/local-storage/storage-item";
import {
	createInstallPromptStore,
	type InstallOutcome,
} from "../infrastructure/install-prompt";
import { HomeInstallCard, InstallEntry } from "./install-entry";

const INSTALL_BUTTON = { name: "ホーム画面に追加" } as const;

// ブラウザのインストールの確認が届いた状態の置き場（確認では、指定した答えを返す）。
function setupStore(outcome: InstallOutcome = "accepted") {
	const target = new EventTarget();
	const store = createInstallPromptStore(target);
	const prompt = vi.fn(async () => ({ outcome }));

	return {
		store,
		prompt,
		deliver: () =>
			act(() => {
				target.dispatchEvent(
					Object.assign(
						new Event("beforeinstallprompt", { cancelable: true }),
						{ prompt },
					),
				);
			}),
	};
}

function setStandalone(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: (query: string) => ({
			matches: matches && query === "(display-mode: standalone)",
			addEventListener: () => {},
			removeEventListener: () => {},
		}),
	});
}

beforeEach(() => {
	localStorage.clear();
	resetStorageItemsForTest();
});

afterEach(() => {
	cleanup();
	Reflect.deleteProperty(window, "matchMedia");
});

describe("InstallEntry", () => {
	it("確認が届くとボタンを出し、押すと確認を1回だけ出して、ボタンを消す", async () => {
		const { store, prompt, deliver } = setupStore();
		render(<InstallEntry store={store} />);

		expect(screen.queryByRole("button", INSTALL_BUTTON)).toBeNull();
		deliver();
		await userEvent.click(screen.getByRole("button", INSTALL_BUTTON));

		expect(prompt).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("button", INSTALL_BUTTON)).toBeNull();
	});

	it("アプリとして開いているときは、確認が届いても何も出さない", () => {
		setStandalone(true);
		const { store, deliver } = setupStore();
		render(<InstallEntry store={store} />);
		deliver();

		expect(screen.queryByText("アプリとして使う")).toBeNull();
	});
});

describe("HomeInstallCard", () => {
	it("×を押したら、描き直しても、もう出さない", async () => {
		const { store, deliver } = setupStore();
		const { unmount } = render(<HomeInstallCard store={store} />);
		deliver();

		await userEvent.click(
			screen.getByRole("button", { name: "アプリの案内を閉じる" }),
		);
		expect(screen.queryByText("アプリとして使う")).toBeNull();

		unmount();
		render(<HomeInstallCard store={store} />);
		deliver();
		expect(screen.queryByText("アプリとして使う")).toBeNull();
	});

	it("確認でインストールを選んだら、もう出さない", async () => {
		const { store, deliver } = setupStore("accepted");
		render(<HomeInstallCard store={store} />);
		deliver();

		await userEvent.click(screen.getByRole("button", INSTALL_BUTTON));
		deliver();

		expect(screen.queryByText("アプリとして使う")).toBeNull();
	});
});
