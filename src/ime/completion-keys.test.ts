import { describe, expect, it } from "vitest";
import {
	type CompletionKey,
	readCompletionKey,
	stepCompletionIndex,
} from "./completion-keys";

type Key = Partial<
	Pick<
		KeyboardEvent,
		"key" | "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
	>
>;

function key(init: Key) {
	return {
		key: "",
		code: "",
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...init,
	};
}

describe("readCompletionKey", () => {
	it.each<[string, Key, CompletionKey | null]>([
		["↓", { key: "ArrowDown" }, "down"],
		["↑", { key: "ArrowUp" }, "up"],
		["Alt+↓ も選ぶ", { key: "ArrowDown", altKey: true }, "down"],
		["Shift+↓ は選ばない", { key: "ArrowDown", shiftKey: true }, null],
		["Tab", { key: "Tab", code: "Tab" }, "accept"],
		["Shift+Tab は決めない", { key: "Tab", code: "Tab", shiftKey: true }, null],
		["Enter", { key: "Enter" }, "accept-selected"],
		["Shift+Enter は決めない", { key: "Enter", shiftKey: true }, null],
		["Esc", { key: "Escape" }, "close"],
		["文字", { key: "a" }, null],
	])("変換していないとき：%s", (_, init, expected) => {
		expect(readCompletionKey(key(init), false)).toBe(expected);
	});

	it.each<[string, Key, CompletionKey | null]>([
		["Alt+↓", { key: "ArrowDown", code: "ArrowDown", altKey: true }, "down"],
		["Alt+↑", { key: "ArrowUp", code: "ArrowUp", altKey: true }, "up"],
		["素の↓は IME", { key: "ArrowDown", code: "ArrowDown" }, null],
		["Shift+↓は IME", { key: "ArrowDown", shiftKey: true }, null],
		[
			"Windows の1回目（Process）は扱わない",
			{ key: "Process", code: "ArrowDown", altKey: true },
			null,
		],
		["Tab（key が Process）", { key: "Process", code: "Tab" }, "accept"],
		["Shift+Tab は IME", { key: "Process", code: "Tab", shiftKey: true }, null],
		["Enter は IME", { key: "Process", code: "Enter" }, null],
		["Esc は IME", { key: "Escape", code: "Escape" }, null],
	])("変換中：%s", (_, init, expected) => {
		expect(readCompletionKey(key(init), true)).toBe(expected);
	});
});

describe("stepCompletionIndex", () => {
	it.each<[number | null, "up" | "down", number, number | null]>([
		[null, "down", 3, 0],
		[null, "up", 3, 2],
		[0, "down", 3, 1],
		[2, "down", 3, 0],
		[0, "up", 3, 2],
		[null, "down", 0, null],
	])("%s から %s（%i件）は %s", (current, direction, count, expected) => {
		expect(stepCompletionIndex(current, direction, count)).toBe(expected);
	});
});
