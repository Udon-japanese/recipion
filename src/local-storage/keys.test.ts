import { describe, expect, it } from "vitest";
import { storageKeys } from "./keys";

describe("storageKeys", () => {
	it("キーは、重複がなく、保存名の接頭辞（recipion:）を含まない", () => {
		const keys = Object.values(storageKeys);

		expect(new Set(keys).size).toBe(keys.length);

		for (const key of keys) {
			expect(key).toMatch(/^[a-z0-9-]+$/u);
		}
	});
});
