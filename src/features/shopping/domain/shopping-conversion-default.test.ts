import { describe, expect, it } from "vitest";
import { parseShoppingMemo } from "./parse-shopping-memo";
import {
	applyConversionDefaults,
	catalogUsualConversion,
	describeConversionDefault,
	findUsualConversionDefault,
	isSameConversionDefault,
	type ShoppingConversionDefault,
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
	toConversionMemoryKey,
} from "./shopping-conversion-default";

function entry(
	name: string,
	value: ShoppingConversionDefault,
	usedAt = 1,
): ShoppingConversionDefaults {
	const nameKey = toConversionDefaultKey(name) ?? "";

	return {
		[toConversionMemoryKey(nameKey, value.unitLabel)]: {
			...value,
			nameKey,
			usedAt,
		},
	};
}

const milk: ShoppingConversionDefault = {
	unitLabel: "本",
	inventoryConversion: {
		inputUnitCode: "本",
		stockUnitCode: "ml",
		stockUnitLabel: "ml",
		stockQuantityPerInputUnit: 900,
		trackingMode: "estimated",
	},
};

function apply(text: string, defaults: ShoppingConversionDefaults = {}) {
	return applyConversionDefaults(parseShoppingMemo(text, []), defaults).map(
		(line) => [
			line.name,
			line.quantity,
			line.unitLabel,
			line.inventoryConversion?.stockQuantityPerInputUnit,
		],
	);
}

describe("applyConversionDefaults：単位のない行", () => {
	it("食材のいつもの単位の記憶があれば、その単位で1つにする（カタログより優先）", () => {
		expect(apply("牛乳", entry("牛乳", milk))).toEqual([
			["牛乳", 1, "本", 900],
		]);
	});

	it("「牛乳 2」のような単位のない数字も、いつもの単位にする（2本）", () => {
		expect(apply("牛乳 2", entry("牛乳", milk))).toEqual([
			["牛乳", 2, "本", 900],
		]);
	});

	it("いつもの単位は、最後に使った単位", () => {
		const defaults = {
			...entry("そうめん", { ...milk, unitLabel: "個" }, 1),
			...entry("そうめん", { ...milk, unitLabel: "袋" }, 2),
		};

		expect(findUsualConversionDefault(defaults, "そうめん")?.unitLabel).toBe(
			"袋",
		);
	});

	it("記憶がなければ、カタログの一般的な売られ方（卵 → 1パック＝10個）", () => {
		expect(apply("卵")).toEqual([["卵", 1, "パック", 10]]);
		expect(apply("牛乳")).toEqual([["牛乳", 1, "本", 1000]]);
	});

	it("量を追わない食材は、その食材の既定の単位で1つ（オリーブオイル → 1本）", () => {
		const [line] = applyConversionDefaults(
			parseShoppingMemo("オリーブオイル", []),
			{},
		);

		expect(line?.unitLabel).toBe("本");
		expect(line?.quantity).toBe(1);
		expect(line?.inventoryConversion?.trackingMode).toBe("presence");
	});

	it("カタログにも記憶にもない食材は、そのまま", () => {
		expect(apply("ティッシュ")).toEqual([["ティッシュ", 1, null, undefined]]);
	});
});

describe("applyConversionDefaults：単位を書いた行", () => {
	it("その単位の記憶があれば、記憶の換算を付ける（数量はそのまま）", () => {
		expect(apply("牛乳 2本", entry("牛乳", milk))).toEqual([
			["牛乳", 2, "本", 900],
		]);
	});

	it("違う単位を書いた行は、記憶の換算を付けない", () => {
		expect(apply("牛乳 2L", entry("牛乳", milk))).toEqual([
			["牛乳", 2, "l", undefined],
		]);
	});

	it("「個」と明示した行は、いつもの単位に置き換えない（卵 2個）", () => {
		expect(
			apply("卵 2個", entry("卵", { ...milk, unitLabel: "パック" })),
		).toEqual([["卵", 2, "個", undefined]]);
	});

	it("食材ごと・単位ごとに別の記憶（そうめん 個＝400g、袋＝500g）", () => {
		const defaults = {
			...entry("そうめん", {
				unitLabel: "個",
				inventoryConversion: {
					...milk.inventoryConversion,
					stockQuantityPerInputUnit: 400,
				},
			}),
			...entry("そうめん", {
				unitLabel: "袋",
				inventoryConversion: {
					...milk.inventoryConversion,
					stockQuantityPerInputUnit: 500,
				},
			}),
		};

		expect(apply("そうめん 1個\nそうめん 1袋", defaults)).toEqual([
			["そうめん", 1, "個", 400],
			["そうめん", 1, "袋", 500],
		]);
	});

	it("食材名は、全角・半角・大文字小文字を同じとみなす", () => {
		expect(toConversionDefaultKey("ＡＢＣ")).toBe(
			toConversionDefaultKey("abc"),
		);
	});
});

describe("catalogUsualConversion", () => {
	it("規格を確認できていない値は、目安の印が付く", () => {
		expect(catalogUsualConversion("ティッシュ")).toBeUndefined();
		expect(
			catalogUsualConversion("豚肉")?.inventoryConversion.isApproximate,
		).toBe(true);
		expect(
			catalogUsualConversion("卵")?.inventoryConversion.isApproximate,
		).toBeUndefined();
	});
});

describe("describeConversionDefault", () => {
	it("目安の換算には「約」を付ける", () => {
		expect(
			describeConversionDefault({
				unitLabel: "パック",
				inventoryConversion: {
					...milk.inventoryConversion,
					stockQuantityPerInputUnit: 250,
					stockUnitLabel: "g",
					isApproximate: true,
				},
			}),
		).toBe("1パック＝約250g");
	});
});

describe("isSameConversionDefault", () => {
	it("同じ内容なら true。単位の表記ゆれ（全角・空白）は、同じとみなす", () => {
		expect(isSameConversionDefault(milk, { ...milk, unitLabel: " 本 " })).toBe(
			true,
		);
	});

	it("換算の量や、単位が違えば false", () => {
		expect(
			isSameConversionDefault(milk, {
				...milk,
				inventoryConversion: {
					...milk.inventoryConversion,
					stockQuantityPerInputUnit: 1000,
				},
			}),
		).toBe(false);
		expect(
			isSameConversionDefault(milk, { ...milk, unitLabel: "パック" }),
		).toBe(false);
	});
});
