import { describe, expect, it } from "vitest";
import {
	preferMeasureUnit,
	rememberMeasureUnit,
} from "./measure-unit-preference-storage";

function createMemoryStorage() {
	const values = new Map<string, string>();

	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
	};
}

describe("最後に選んだ重さ・体積の単位の記憶", () => {
	it("食材ごと・重さと体積ごとに、最後に選んだ方を返す。別名は同じ食材。覚えていなければ、そのまま", () => {
		const storage = createMemoryStorage();

		expect(preferMeasureUnit("鶏もも肉", "g", storage)).toBe("g");

		rememberMeasureUnit("鶏もも肉", "kg", storage);

		expect(preferMeasureUnit("鶏もも肉", "g", storage)).toBe("kg");
		// 選んだのが kg でも、kg を渡せば kg のまま
		expect(preferMeasureUnit("鶏もも肉", "kg", storage)).toBe("kg");
		// 体積は、別に覚える
		expect(preferMeasureUnit("鶏もも肉", "ml", storage)).toBe("ml");
		// ほかの食材には、効かない
		expect(preferMeasureUnit("豚こま", "g", storage)).toBe("g");

		rememberMeasureUnit("しょうゆ", "L", storage);

		expect(preferMeasureUnit("醤油", "ml", storage)).toBe("L");

		// 戻したら、戻した方
		rememberMeasureUnit("鶏もも肉", "g", storage);

		expect(preferMeasureUnit("鶏もも肉", "kg", storage)).toBe("g");
	});

	it("重さ・体積でない単位と、名前が空のときは、覚えない", () => {
		const storage = createMemoryStorage();

		rememberMeasureUnit("鶏もも肉", "枚", storage);
		rememberMeasureUnit("", "kg", storage);

		expect(preferMeasureUnit("鶏もも肉", "枚", storage)).toBe("枚");
		expect(preferMeasureUnit("", "g", storage)).toBe("g");
		expect(storage.getItem("recipion:measure-unit-preference")).toBeNull();
	});
});
