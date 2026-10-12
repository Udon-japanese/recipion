import { describe, expect, it } from "vitest";
import { upsertById } from "./upsert-by-id";

describe("upsertById", () => {
	it("なければ最後に足し、あれば同じ位置で置き換える", () => {
		const list = [
			{ id: "a", value: 1 },
			{ id: "b", value: 2 },
		];

		expect(upsertById(list, { id: "c", value: 3 })).toHaveLength(3);
		expect(upsertById(list, { id: "a", value: 9 })).toEqual([
			{ id: "a", value: 9 },
			{ id: "b", value: 2 },
		]);
	});
});
