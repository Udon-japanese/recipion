import { describe, expect, it } from "vitest";
import { checkExpectedUser } from "./expected-user";

describe("checkExpectedUser", () => {
	it.each([
		{ label: "同じ人", expected: "user-a", ok: true },
		{ label: "別の人", expected: "user-b", ok: false },
		{ label: "指定なし（確かめない）", expected: undefined, ok: true },
	])("Cookie の人が user-a で、画面が「$label」", ({ expected, ok }) => {
		expect(checkExpectedUser("user-a", expected)).toBe(ok);
	});
});
