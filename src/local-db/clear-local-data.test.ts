import { describe, expect, it } from "vitest";
import { clearAppLocalStorage } from "./clear-local-data";

function createStorage(initial: Record<string, string>) {
	const data = new Map(Object.entries(initial));

	return {
		data,
		get length() {
			return data.size;
		},
		key: (index: number) => [...data.keys()][index] ?? null,
		removeItem: (key: string) => {
			data.delete(key);
		},
	};
}

describe("clearAppLocalStorage", () => {
	it("recipion: で始まるキーだけを消す", () => {
		const storage = createStorage({
			"recipion:expiry-hints": "[]",
			"recipion:expiry-estimate-level": "sure",
			other: "keep",
		});

		clearAppLocalStorage(storage);

		expect([...storage.data.keys()]).toEqual(["other"]);
	});
});
