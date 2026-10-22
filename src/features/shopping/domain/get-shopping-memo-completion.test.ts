import { describe, expect, it } from "vitest";
import {
	applyShoppingMemoCompletion,
	getShoppingMemoCompletion,
} from "./get-shopping-memo-completion";

const stores = [
	{ id: "aeon", name: "イオン" },
	{ id: "gyomu", name: "業務スーパー" },
];

function labelsAtEnd(text: string) {
	return (
		getShoppingMemoCompletion(text, text.length, stores)?.items.map(
			(item) => item.label,
		) ?? []
	);
}

describe("getShoppingMemoCompletion", () => {
	it("書きかけの食材名を、カタログから補完する（ひらがなでも）", () => {
		expect(labelsAtEnd("卵\n玉ね")).toContain("玉ねぎ");
		expect(labelsAtEnd("たまね")).toContain("玉ねぎ");
	});

	it("店の名前も、見出しの候補に出す（前方一致）", () => {
		expect(labelsAtEnd("イ")).toContain("イオン");
	});

	it("@のあとは、登録済みの店だけを出す", () => {
		expect(labelsAtEnd("卵 @")).toEqual(["イオン", "業務スーパー"]);
		expect(labelsAtEnd("卵 @業")).toEqual(["業務スーパー"]);
		expect(labelsAtEnd("卵 @ドンキ")).toEqual([]);
	});

	it("数量を書き始めたあと・行の途中・空の行では、出さない", () => {
		expect(labelsAtEnd("玉ねぎ 2")).toEqual([]);
		expect(labelsAtEnd("")).toEqual([]);
		expect(getShoppingMemoCompletion("玉ね 1個", 2, stores)).toBeNull();
	});

	it("書き終えた名前（完全一致）は、候補に出さない", () => {
		expect(labelsAtEnd("イオン")).not.toContain("イオン");
		expect(labelsAtEnd("にんにく")).not.toContain("にんにく");
	});

	it("変換中（includeExact）は、完全一致の候補も出す（食材・店・@のあとの店）", () => {
		function exactLabels(text: string) {
			return (
				getShoppingMemoCompletion(text, text.length, stores, {
					includeExact: true,
				})?.items.map((item) => item.label) ?? []
			);
		}

		expect(exactLabels("にんにく")).toContain("にんにく");
		expect(exactLabels("イオン")).toContain("イオン");
		expect(exactLabels("@イオン")).toContain("イオン");
	});

	it("候補で、書きかけの部分だけを置き換える", () => {
		const text = "卵 10個\\n玉ね".replace("\\n", "\n");
		const completion = getShoppingMemoCompletion(text, text.length, stores);

		expect(completion).not.toBeNull();

		const index = completion?.items.findIndex(
			(item) => item.label === "玉ねぎ",
		);
		const applied = applyShoppingMemoCompletion(
			text,
			completion as NonNullable<typeof completion>,
			index ?? 0,
		);

		expect(applied.text).toBe("卵 10個\n玉ねぎ");
		expect(applied.caret).toBe(applied.text.length);
	});

	it("@のあとの候補で、店の名前だけを置き換える", () => {
		const text = "卵 @業";
		const completion = getShoppingMemoCompletion(text, text.length, stores);
		const applied = applyShoppingMemoCompletion(
			text,
			completion as NonNullable<typeof completion>,
			0,
		);

		expect(applied.text).toBe("卵 @業務スーパー");
	});
});
