import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { resetToastsForTest } from "#/components/toast/toast-store";

class ResizeObserverMock {
	observe() {}

	unobserve() {}

	disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

afterEach(() => {
	cleanup();
	// 画面の上のお知らせは、React の外に持つので、テストごとに空にする。
	resetToastsForTest();
});
