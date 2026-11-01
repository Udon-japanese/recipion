import { describe, expect, it } from "vitest";
import {
	findStandInCandidates,
	type StandInMode,
	type StandInNeed,
	type StandInStockItem,
} from "./find-stand-ins";

function need(
	name: string,
	quantity: number | null,
	unitLabel: string | null,
): StandInNeed {
	return { name, quantity, unitLabel };
}

function frozen(
	name: string,
	quantity: number,
	trackingMode: StandInStockItem["trackingMode"] = "estimated",
): StandInStockItem {
	return {
		name,
		quantity,
		stockUnitCode: "g",
		stockUnitLabel: "g",
		trackingMode,
	};
}

type Expected = {
	auto: [name: string, required: number | null][];
	ask: [name: string, required: number | null][];
};

const none: Expected = { auto: [], ask: [] };

// [説明, 材料, 在庫, 設定, 期待する結果（名前と、必要な量）]
const cases: [
	string,
	StandInNeed,
	StandInStockItem[],
	StandInMode,
	Expected,
][] = [
	[
		"形が自由な冷凍で足りれば、自動で使う",
		need("ブロッコリー", 300, "g"),
		[frozen("冷凍ブロッコリー", 500)],
		"auto",
		{ auto: [["冷凍ブロッコリー", 300]], ask: [] },
	],
	[
		"量がちょうどでも、足りている",
		need("ブロッコリー", 500, "g"),
		[frozen("冷凍ブロッコリー", 500)],
		"auto",
		{ auto: [["冷凍ブロッコリー", 500]], ask: [] },
	],
	[
		"量が足りなければ、候補にしない（在庫がありますとも知らせない）",
		need("ブロッコリー", 600, "g"),
		[frozen("冷凍ブロッコリー", 500)],
		"auto",
		none,
	],
	[
		"形が決まっている冷凍は、自動の設定でも、選ぶ候補にする",
		need("玉ねぎ", 300, "g"),
		[frozen("冷凍玉ねぎ(みじん切り)", 500)],
		"auto",
		{ auto: [], ask: [["冷凍玉ねぎ(みじん切り)", 300]] },
	],
	[
		"単位が違うときは、生の食材の重さで換算して比べる（玉ねぎ2個＝400g）",
		need("玉ねぎ", 2, "個"),
		[frozen("冷凍玉ねぎ(みじん切り)", 400)],
		"auto",
		{ auto: [], ask: [["冷凍玉ねぎ(みじん切り)", 400]] },
	],
	[
		"換算しても足りなければ、候補にしない（玉ねぎ3個＝600g）",
		need("玉ねぎ", 3, "個"),
		[frozen("冷凍玉ねぎ(みじん切り)", 500)],
		"auto",
		none,
	],
	[
		"換算できない単位は、足りるか確かめられないので、候補にしない",
		need("玉ねぎ", 1, "袋"),
		[frozen("冷凍玉ねぎ(みじん切り)", 500)],
		"auto",
		none,
	],
	[
		"量のない材料（適量）は、在庫があれば候補にする",
		need("ブロッコリー", null, null),
		[frozen("冷凍ブロッコリー", 50)],
		"auto",
		{ auto: [["冷凍ブロッコリー", null]], ask: [] },
	],
	[
		"在庫が0なら、量のない材料でも、候補にしない",
		need("ブロッコリー", null, null),
		[frozen("冷凍ブロッコリー", 0)],
		"auto",
		none,
	],
	[
		"有無だけで管理している冷凍は、あれば候補にする（量は比べない）",
		need("ブロッコリー", 300, "g"),
		[frozen("冷凍ブロッコリー", 1, "presence")],
		"auto",
		{ auto: [["冷凍ブロッコリー", null]], ask: [] },
	],
	[
		"毎回選ぶの設定では、形が自由な冷凍も、選ぶ候補にする",
		need("ブロッコリー", 300, "g"),
		[frozen("冷凍ブロッコリー", 500)],
		"ask",
		{ auto: [], ask: [["冷凍ブロッコリー", 300]] },
	],
	[
		"毎回選ぶの設定でも、量が足りなければ、候補にしない",
		need("玉ねぎ", 600, "g"),
		[frozen("冷凍玉ねぎ(みじん切り)", 500)],
		"ask",
		none,
	],
	[
		"使わないの設定では、足りていても、候補にしない",
		need("ブロッコリー", 300, "g"),
		[frozen("冷凍ブロッコリー", 500)],
		"off",
		none,
	],
	[
		"代わりにならない冷凍（フライドポテト）は、候補にしない",
		need("じゃがいも", 100, "g"),
		[frozen("冷凍ポテト(シューストリング)", 1000)],
		"auto",
		none,
	],
];

describe("findStandInCandidates", () => {
	it.each(cases)("%s", (_title, recipeNeed, stockItems, mode, expected) => {
		const result = findStandInCandidates(recipeNeed, stockItems, mode);
		const pick = (list: typeof result.auto) =>
			list.map(({ item, required }) => [item.name, required]);

		expect({ auto: pick(result.auto), ask: pick(result.ask) }).toEqual(
			expected,
		);
	});

	it("残りの量（同じ食材を前の行で使った分）で比べる", () => {
		const result = findStandInCandidates(
			need("ブロッコリー", 300, "g"),
			[frozen("冷凍ブロッコリー", 500)],
			"auto",
			() => 200,
		);

		expect(result).toEqual({ auto: [], ask: [] });
	});

	it("作り置きのできあがりは、代わりの食材にしない", () => {
		const result = findStandInCandidates(
			need("ブロッコリー", 300, "g"),
			[{ ...frozen("冷凍ブロッコリー", 500), sourceRecipePublicId: "r-1" }],
			"auto",
		);

		expect(result).toEqual({ auto: [], ask: [] });
	});
});
