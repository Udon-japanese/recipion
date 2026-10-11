import { describe, expect, it } from "vitest";
import { normalizeEmailForBan } from "./email-for-ban";

describe("normalizeEmailForBan", () => {
	it.each([
		["Taro@Example.com", "taro@example.com"],
		["taro+news@example.com", "taro@example.com"],
		["t.a.r.o+x@gmail.com", "taro@gmail.com"],
		["taro@googlemail.com", "taro@gmail.com"],
		// Gmail 以外のドットは、別のアドレス。
		["t.aro@example.com", "t.aro@example.com"],
		["  taro@example.com ", "taro@example.com"],
	])("%s → %s", (input, expected) => {
		expect(normalizeEmailForBan(input)).toBe(expected);
	});
});
