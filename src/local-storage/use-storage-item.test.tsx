import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storageKeys } from "./keys";
import { enumStorageItem, resetStorageItemsForTest } from "./storage-item";
import { useStorageItem } from "./use-storage-item";

const level = enumStorageItem({
	key: storageKeys.expiryEstimateLevel,
	values: ["off", "reliable", "all"],
	defaultValue: "reliable",
});

function Level() {
	const [value, setValue] = useStorageItem(level);

	return (
		<div>
			<output>{value}</output>
			<button type="button" onClick={() => setValue("all")}>
				all
			</button>
		</div>
	);
}

beforeEach(() => {
	localStorage.clear();
	resetStorageItemsForTest();
});

afterEach(cleanup);

describe("useStorageItem", () => {
	it("保存した値を表示する。変更すると、画面と保存の両方が、更新される", async () => {
		localStorage.setItem(level.key, "off");

		render(<Level />);

		expect(screen.getByRole("status")).toHaveTextContent("off");

		await userEvent.click(screen.getByRole("button", { name: "all" }));

		expect(screen.getByRole("status")).toHaveTextContent("all");
		expect(localStorage.getItem(level.key)).toBe("all");
	});

	it("他のタブでの変更（storage イベント）で、画面が更新される", () => {
		render(<Level />);

		expect(screen.getByRole("status")).toHaveTextContent("reliable");

		act(() => {
			localStorage.setItem(level.key, "off");
			window.dispatchEvent(new StorageEvent("storage", { key: level.key }));
		});

		expect(screen.getByRole("status")).toHaveTextContent("off");
	});

	it("サーバーの描画は、保存した値があっても、既定値（ブラウザで、切り替わる）", () => {
		localStorage.setItem(level.key, "off");

		expect(renderToString(<Level />)).toContain("reliable");
	});
});
