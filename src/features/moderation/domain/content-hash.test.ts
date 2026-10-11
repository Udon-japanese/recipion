import { describe, expect, it } from "vitest";
import { hashModerationItems } from "./content-hash";

describe("hashModerationItems", () => {
	it("同じ内容は同じ、違う内容・違う欄は違うハッシュ。空の文章は無視する", async () => {
		const a = await hashModerationItems([
			{ target: "recipe-note", text: "おいしい" },
			{ target: "recipe-title", text: "  " },
		]);

		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(
			await hashModerationItems([{ target: "recipe-note", text: "おいしい" }]),
		).toBe(a);
		expect(
			await hashModerationItems([{ target: "recipe-title", text: "おいしい" }]),
		).not.toBe(a);
		expect(
			await hashModerationItems([{ target: "recipe-note", text: "まずい" }]),
		).not.toBe(a);
	});
});
