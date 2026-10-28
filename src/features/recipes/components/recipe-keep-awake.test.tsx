import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetStorageItemsForTest } from "#/local-storage/storage-item";
import { RecipeKeepAwake } from "./recipe-keep-awake";

function installWakeLock() {
	const sentinel = Object.assign(new EventTarget(), {
		released: false,
		release: vi.fn(async () => {}),
	});
	const request = vi.fn(async () => sentinel);

	Object.defineProperty(navigator, "wakeLock", {
		configurable: true,
		value: { request },
	});

	return { request, sentinel };
}

beforeEach(() => {
	localStorage.clear();
	resetStorageItemsForTest();
});

afterEach(() => {
	Reflect.deleteProperty(navigator, "wakeLock");
});

describe("RecipeKeepAwake", () => {
	it("使えないブラウザでは、何も出さない", () => {
		render(<RecipeKeepAwake />);

		expect(screen.queryByRole("switch")).toBeNull();
	});

	it("初めは入で、画面のロックを求める", async () => {
		const { request } = installWakeLock();

		render(<RecipeKeepAwake />);

		expect(
			screen.getByRole("switch", { name: "調理中は、画面を消さない" }),
		).toBeChecked();
		await vi.waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
	});

	it("切ると、ロックを返し、その設定を、この端末に覚える", async () => {
		const user = userEvent.setup();
		const { request, sentinel } = installWakeLock();

		render(<RecipeKeepAwake />);
		await vi.waitFor(() => expect(request).toHaveBeenCalled());

		await user.click(screen.getByRole("switch"));

		expect(screen.getByRole("switch")).not.toBeChecked();
		expect(sentinel.release).toHaveBeenCalled();
		expect(localStorage.getItem("recipion:recipe-keep-awake")).toBe("off");
	});

	it("切っていた設定は、次に開いても、ロックを求めない", () => {
		localStorage.setItem("recipion:recipe-keep-awake", "off");

		const { request } = installWakeLock();

		render(<RecipeKeepAwake />);

		expect(screen.getByRole("switch")).not.toBeChecked();
		expect(request).not.toHaveBeenCalled();
	});
});
