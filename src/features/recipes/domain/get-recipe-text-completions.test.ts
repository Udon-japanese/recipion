import { describe, expect, it } from "vitest";
import {
	adjustCompletionItem,
	applyRecipeTextCompletion,
	getRecipeTextCompletion,
	type RecipeTextCompletion,
} from "./get-recipe-text-completions";
import type { RecipeLinkReference } from "./recipe-links";

function requireCompletion(
	text: string,
	caret = text.length,
	recipeNames: string[] = [],
): RecipeTextCompletion {
	const completion = getRecipeTextCompletion(text, caret, recipeNames);

	if (!completion) {
		throw new Error("補完の候補があるはず");
	}

	return completion;
}

// 本文の最後（カーソルが末尾）での補完の、候補の文字列。
function labelsAtEnd(text: string, recipeNames: string[] = []) {
	return (
		getRecipeTextCompletion(text, text.length, recipeNames)?.items.map(
			(item) => item.label,
		) ?? []
	);
}

describe("getRecipeTextCompletion（見出し）", () => {
	it("飾りを打つと、4つの見出しを出す", () => {
		for (const opener of ["＜", "<", "【", "■", "["]) {
			expect(labelsAtEnd(opener)).toEqual([
				"＜下準備＞",
				"＜材料＞",
				"＜作り方＞",
				"＜メモ＞",
			]);
		}
	});

	it("続けて打った文字で、絞り込む", () => {
		expect(labelsAtEnd("＜作")).toEqual(["＜作り方＞"]);
		expect(labelsAtEnd("<し")).toEqual([]);
	});

	it("閉じ括弧まで打った見出しには、出さない", () => {
		expect(labelsAtEnd("＜材料＞")).toEqual([]);
	});

	it("見出しを入れると、次の行へ移る", () => {
		const text = "＜作";
		const completion = requireCompletion(text);

		expect(applyRecipeTextCompletion(text, completion, 0)).toEqual({
			text: "＜作り方＞\n",
			caret: "＜作り方＞\n".length,
		});
	});

	it("自動で入った閉じ括弧は、一緒に置き換える", () => {
		const text = "＜＞\n卵 1個";
		const completion = requireCompletion(text, 1);

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"＜下準備＞\n卵 1個",
		);
	});
});

describe("getRecipeTextCompletion（材料の名前）", () => {
	it("＜材料＞の中の行の先頭で、カタログの食材名を出す（ひらがなでも）", () => {
		expect(labelsAtEnd("＜材料＞\n玉ね")).toContain("玉ねぎ");
		expect(labelsAtEnd("＜材料＞\nたまね")).toContain("玉ねぎ");
		expect(labelsAtEnd("＜材料＞\n・玉ね")).toContain("玉ねぎ");
	});

	it("名前を入れると、行の先頭から置き換わる", () => {
		const text = "＜材料＞\n・たまね";
		const completion = requireCompletion(text);
		const index = completion.items.findIndex((item) => item.label === "玉ねぎ");

		expect(index).toBeGreaterThanOrEqual(0);
		expect(applyRecipeTextCompletion(text, completion, index ?? 0).text).toBe(
			"＜材料＞\n・玉ねぎ",
		);
	});

	it("グループの印（☆ など）の後ろでも、材料名を出し、印を残して置き換える", () => {
		const text = "＜材料＞\n☆たまね";
		const completion = requireCompletion(text);
		const index = completion.items.findIndex((item) => item.label === "玉ねぎ");

		expect(index).toBeGreaterThanOrEqual(0);
		expect(applyRecipeTextCompletion(text, completion, index).text).toBe(
			"＜材料＞\n☆玉ねぎ",
		);
		// 印だけのときは、材料名は出さない
		expect(labelsAtEnd("＜材料＞\n☆")).not.toContain("玉ねぎ");
	});

	it("分量を打ち始めたあと、見出しがないときは、出さない", () => {
		expect(labelsAtEnd("＜材料＞\n玉ねぎ 1")).toEqual([]);
		expect(labelsAtEnd("玉ね")).toEqual([]);
		expect(labelsAtEnd("＜メモ＞\n玉ね")).toEqual([]);
	});

	it("カーソルの前後の文字を合わせた、書き終えていない名前には、出す", () => {
		const text = "＜材料＞\nたまね 1個";
		const completion = requireCompletion(text, "＜材料＞\nたまね".length);

		expect(completion.items.map((item) => item.label)).toContain("玉ねぎ");
		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"＜材料＞\n玉ねぎ 1個",
		);
	});

	it("カーソルの後ろの文字も含めて、置き換える", () => {
		const text = "＜材料＞\nたま|ね 1個".replace("|", "");
		const completion = requireCompletion(text, "＜材料＞\nたま".length);

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"＜材料＞\n玉ねぎ 1個",
		);
	});

	it("カーソルの後ろに文字がなければ、次の行に文字があっても、出す", () => {
		const text = "＜材料＞\nたまね\n卵 1個";

		expect(
			getRecipeTextCompletion(text, "＜材料＞\nたまね".length)?.items.map(
				(item) => item.label,
			),
		).toContain("玉ねぎ");
	});

	it("書き終えた見出しの途中（前後で見出しが完成する）では、出さない", () => {
		expect(getRecipeTextCompletion("＜下準備＞", 2)).toBeNull();
		expect(getRecipeTextCompletion("＜下準備＞", 1)).toBeNull();
		expect(getRecipeTextCompletion("＜材料＞", 4)).toBeNull();
		expect(getRecipeTextCompletion("＜作 メモ", 2)).toBeNull();
	});

	it("書きかけの見出しは、カーソルの後ろの文字も含めて、置き換える", () => {
		const text = "＜材";
		const completion = requireCompletion(text, 1);

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"＜材料＞\n",
		);
		expect(getRecipeTextCompletion("＜材＞", 1)).not.toBeNull();
	});

	it("見出しの補完は、後ろの閉じ括弧があっても出す", () => {
		expect(getRecipeTextCompletion("＜＞", 1)).not.toBeNull();
		expect(getRecipeTextCompletion("＜作＞", 2)).not.toBeNull();
	});
});

describe("getRecipeTextCompletion（作り方・下準備の中の、材料の名前）", () => {
	const names = ["玉ねぎ", "豚ひき肉", "ソース"];

	it("材料名の始まりを打つと、その名前を出す", () => {
		expect(labelsAtEnd("＜作り方＞\n1. 玉ね", names)).toEqual(["玉ねぎ"]);
		expect(labelsAtEnd("＜下準備＞\n- 豚ひ", names)).toEqual(["豚ひき肉"]);
	});

	it("文章の途中でも、材料名の始まりを、末尾から探す", () => {
		expect(labelsAtEnd("＜作り方＞\n1. フライパンで玉ね", names)).toEqual([
			"玉ねぎ",
		]);
	});

	it("1文字では出さず、名前が完成したあとは出さない", () => {
		expect(labelsAtEnd("＜作り方＞\n1. 玉", names)).toEqual([]);
		expect(labelsAtEnd("＜作り方＞\n1. 玉ねぎ", names)).toEqual([]);
	});

	it("カーソルの前後の文字を合わせて、書き終えていれば出さず、途中なら出す", () => {
		const tomato = ["トマト"];

		expect(
			getRecipeTextCompletion("＜作り方＞\n最初に、トマトを切る", 11, tomato),
		).toBeNull();
		expect(
			getRecipeTextCompletion("＜作り方＞\n最初に、トマを切る", 12, tomato),
		).not.toBeNull();
	});

	it("変換中（includeExact）は、書き終えた名前でも、候補に出す（材料・作り方の中の材料名・見出し）", () => {
		function labelsExact(text: string, caret: number, names: string[] = []) {
			return (
				getRecipeTextCompletion(text, caret, names, undefined, {
					includeExact: true,
				})?.items.map((item) => item.label) ?? []
			);
		}

		// 材料の行の、カタログの食材名。確定後（既定）は出さない。
		expect(labelsExact("＜材料＞\nにんにく", 11)).toContain("にんにく");
		expect(labelsAtEnd("＜材料＞\nにんにく")).not.toContain("にんにく");
		// 作り方の中の、材料の名前。
		expect(
			labelsExact("＜作り方＞\n最初に、トマトを切る", 11, ["トマト"]),
		).toContain("トマト");
		// 書き終えた見出し（括弧の内側にカーソルがあるとき）。
		expect(getRecipeTextCompletion("＜材料＞", 3)).toBeNull();
		expect(labelsExact("＜材料＞", 3)).toContain("＜材料＞");
	});

	it("文章に同じ材料名が書いてあっても、途中まで打った名前には、前後の文字を合わせて出す", () => {
		const onion = ["玉ねぎ"];
		const cases: [string, string][] = [
			["玉ねぎをた|までほげほげする", "玉ねぎを玉ねぎでほげほげする"],
			["玉ねぎをたま|でほげほげする", "玉ねぎを玉ねぎでほげほげする"],
			["玉ねぎをた|まねでほげほげする", "玉ねぎを玉ねぎでほげほげする"],
		];
		const results = cases.map(([marked, expected]) => {
			const text = `＜作り方＞\n${marked.replace("|", "")}`;
			const caret = `＜作り方＞\n${marked.slice(0, marked.indexOf("|"))}`
				.length;
			const completion = getRecipeTextCompletion(text, caret, onion);

			return {
				actual: completion
					? applyRecipeTextCompletion(text, completion, 0).text
					: null,
				expected: `＜作り方＞\n${expected}`,
			};
		});

		expect(results.map((result) => result.actual)).toEqual(
			results.map((result) => result.expected),
		);
	});

	it("入れると、打った部分だけが、名前に置き換わる", () => {
		const text = "＜作り方＞\n1. フライパンで玉ね";
		const completion = requireCompletion(text, text.length, names);

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"＜作り方＞\n1. フライパンで玉ねぎ",
		);
	});
});

describe("getRecipeTextCompletion（記号）", () => {
	it("読み仮名から、記号を出す（カタカナでも）", () => {
		expect(labelsAtEnd("＜材料＞\nほし")).toEqual(["☆（ほし）", "★（ほし）"]);
		expect(labelsAtEnd("＜材料＞\nすたー").slice(0, 2)).toEqual([
			"☆（ほし）",
			"★（ほし）",
		]);
		expect(labelsAtEnd("＜材料＞\nスター").slice(0, 2)).toEqual([
			"☆（ほし）",
			"★（ほし）",
		]);
		expect(labelsAtEnd("＜材料＞\nくろほし")).toEqual(["★（ほし）"]);
		expect(labelsAtEnd("＜作り方＞\nまる")).toContain("○（まる）");
	});

	it("見出しがなくても、メモの中でも、出す", () => {
		expect(labelsAtEnd("ほし")).toEqual(["☆（ほし）", "★（ほし）"]);
		expect(labelsAtEnd("＜メモ＞\nこめ")).toContain("※（こめ）");
	});

	it("1文字では出さない", () => {
		expect(labelsAtEnd("＜材料＞\nほ")).not.toContain("☆（ほし）");
	});

	it("食材名にも一致するときは、記号を先頭にして、食材名を続ける", () => {
		const labels = labelsAtEnd("＜材料＞\nすたー");

		expect(labels.slice(0, 2)).toEqual(["☆（ほし）", "★（ほし）"]);
		expect(labels).toContain("ウスターソース");
	});

	it("入れると、打った読み仮名だけが、記号に置き換わる", () => {
		const text = "＜材料＞\nすたー";
		const completion = requireCompletion(text);

		expect(applyRecipeTextCompletion(text, completion, 0)).toEqual({
			text: "＜材料＞\n☆",
			caret: "＜材料＞\n☆".length,
		});
	});
});

describe("getRecipeTextCompletion（見出しがないとき）", () => {
	const names = ["玉ねぎ", "豚ひき肉"];

	it("作り方と判別できるブロックの中で、材料名を出す", () => {
		// 番号つき
		expect(labelsAtEnd("1. 玉ね", names)).toEqual(["玉ねぎ"]);
		// 文章が続く
		expect(labelsAtEnd("豚ひき肉を炒める\n玉ね", names)).toEqual(["玉ねぎ"]);
		// 材料のブロックのあとの、作り方のブロック
		expect(labelsAtEnd("卵 1個\n\n1. 混ぜる\n2. 玉ね", names)).toEqual([
			"玉ねぎ",
		]);
	});

	it("材料と判別できるブロックの中で、食材名を出す", () => {
		expect(labelsAtEnd("卵 1個\nたまね")).toContain("玉ねぎ");
	});

	it("判別できない、短い1行では、出さない", () => {
		expect(labelsAtEnd("玉ね", names)).toEqual([]);
	});
});

describe("getRecipeTextCompletion（食材の別名・読み仮名）", () => {
	const names = ["玉ねぎ", "豚ひき肉"];

	it("カタログにある食材は、読み仮名・別名でも、書いた材料名を出す", () => {
		expect(labelsAtEnd("＜作り方＞\n1. たまね", names)).toEqual(["玉ねぎ"]);
		expect(labelsAtEnd("＜作り方＞\n1. タマネ", names)).toEqual(["玉ねぎ"]);
		expect(labelsAtEnd("＜作り方＞\n1. オニオ", names)).toEqual(["玉ねぎ"]);
	});

	it("入れると、書いた材料名になる", () => {
		const text = "＜作り方＞\n1. たまね";
		const completion = requireCompletion(text, text.length, names);

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"＜作り方＞\n1. 玉ねぎ",
		);
	});

	it("カタログにない材料名は、書いたとおりの名前だけで出す（ひらがな・カタカナの違いは吸収）", () => {
		expect(labelsAtEnd("＜作り方＞\n1. ぷりぷ", ["プリプリ海老"])).toEqual([
			"プリプリ海老",
		]);
	});
});

describe("adjustCompletionItem", () => {
	const item = { label: "トマト", insert: "トマト", from: 5, to: 7 };

	it("変換の確定で本文の長さが変わった分だけ、範囲の終わりをずらす", () => {
		expect(adjustCompletionItem(item, { start: 5, delta: 2 })).toEqual({
			...item,
			to: 9,
		});
		expect(adjustCompletionItem(item, { start: 5, delta: 0 })).toEqual(item);
	});

	it("変換の始まりより後から始まる範囲は、始まりも、ずらす", () => {
		expect(adjustCompletionItem(item, { start: 3, delta: -1 })).toEqual({
			...item,
			from: 4,
			to: 6,
		});
	});
});

describe("getRecipeTextCompletion（レシピへのリンク）", () => {
	const targets = [
		{
			publicId: "a",
			name: "トマトカレー",
			createdAt: "2026-10-01T00:00:00+09:00",
		},
		{
			publicId: "b",
			name: "カレーうどん",
			createdAt: "2026-10-01T00:00:00+09:00",
		},
	];
	function complete(
		text: string,
		caret = text.length,
		links: RecipeLinkReference[] = [],
	) {
		return getRecipeTextCompletion(text, caret, [], { targets, links });
	}

	it("[[ のあとの文字で、自分のレシピの候補を出す（ひらがなでも）", () => {
		const completion = complete("1. [[かれ");

		expect(completion?.items.map((item) => item.label)).toEqual([
			"カレーうどん",
			"トマトカレー",
		]);
		expect(completion?.items[0]?.link).toEqual({
			label: "カレーうどん",
			targetPublicId: "b",
		});
	});

	it("[[ だけでも、候補を出す", () => {
		expect(complete("[[")?.items).toHaveLength(2);
	});

	it("入れると、[[ から、[[名前]] に置き換わる", () => {
		const text = "1. [[かれ";
		const completion = complete(text);

		if (!completion) {
			throw new Error("補完の候補があるはず");
		}

		expect(applyRecipeTextCompletion(text, completion, 0)).toEqual({
			text: "1. [[カレーうどん]]",
			caret: "1. [[カレーうどん]]".length,
		});
	});

	it("カーソルの後ろの ]] まで、置き換える（]] が重ならない）", () => {
		const text = "[[かれ]] を煮る";
		const completion = complete(text, 4);

		if (!completion) {
			throw new Error("補完の候補があるはず");
		}

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"[[カレーうどん]] を煮る",
		);
	});

	it("カーソルの前後の文字を合わせて探す（[[か|れ]]）", () => {
		const text = "[[かれ]]";
		const completion = complete(text, 3);

		expect(completion?.items[0]?.label).toBe("カレーうどん");
		expect(
			completion && applyRecipeTextCompletion(text, completion, 0).text,
		).toBe("[[カレーうどん]]");
	});

	it("閉じていない [[ の後ろに文章が続いていても、文章は置き換えない", () => {
		const text = "[[か を煮る";
		const completion = complete(text, 3);

		expect(
			completion && applyRecipeTextCompletion(text, completion, 0).text,
		).toBe("[[カレーうどん]] を煮る");
	});

	it("閉じた [[…]] のあとや、一致がないときは、出さない", () => {
		expect(complete("[[カレー]]")).toBeNull();
		expect(complete("[[ラーメン")).toBeNull();
	});

	it("[[ の中では、ほかの補完（食材名）は、出さない", () => {
		const text = "＜材料＞\n[[とま";

		expect(
			getRecipeTextCompletion(text, text.length, [], {
				targets: [],
				links: [],
			}),
		).toBeNull();
	});

	it("同じラベルが別のレシピに使われていれば、番号を付けたラベルで入れる", () => {
		const completion = complete("[[かれーう", undefined, [
			{ label: "カレーうどん", targetPublicId: "other" },
		]);

		expect(completion?.items[0]?.insert).toBe("[[カレーうどん（2）]]");
		expect(completion?.items[0]?.link).toEqual({
			label: "カレーうどん（2）",
			targetPublicId: "b",
		});
	});

	it("同じ名前のレシピが複数あるときだけ、候補の表示に登録日を添える（入るラベルは、名前のまま）", () => {
		const duplicated = [
			{ publicId: "a", name: "カレー", createdAt: "2026-10-01T10:00:00+09:00" },
			{ publicId: "b", name: "カレー", createdAt: "2026-10-05T10:00:00+09:00" },
			{
				publicId: "c",
				name: "カレーうどん",
				createdAt: "2026-10-01T10:00:00+09:00",
			},
		];
		const completion = getRecipeTextCompletion("[[かれ", 4, [], {
			targets: duplicated,
			links: [],
		});

		expect(completion?.items.map((item) => item.label)).toEqual([
			"カレー ・ 10/1 登録",
			"カレー ・ 10/5 登録",
			"カレーうどん",
		]);
		expect(completion?.items[0]?.insert).toBe("[[カレー]]");
	});
});

describe("getRecipeTextCompletion（他の人のレシピへのリンク）", () => {
	const others = {
		users: [
			{ handle: "taro", name: "たろう" },
			{ handle: "tomo", name: "ともこ" },
		],
		recipes: [
			{
				publicId: "r1",
				name: "カレー",
				createdAt: "2026-10-01T00:00:00+09:00",
				authorName: "たろう",
				authorHandle: "taro",
			},
			{
				publicId: "r2",
				name: "カレーうどん",
				createdAt: "2026-10-02T00:00:00+09:00",
				authorName: "たろう",
				authorHandle: "taro",
			},
		],
	};
	const context = { targets: [], links: [], others };

	it("[[@ のあとの文字で、ユーザーを探す。選ぶと、[[@ハンドル/ になり、続けてレシピを選べる", () => {
		const text = "煮る [[@t";
		const completion = getRecipeTextCompletion(text, text.length, [], context);

		expect(completion?.items.map((item) => item.label)).toEqual([
			"たろう（@taro）",
			"ともこ（@tomo）",
		]);
		expect(completion?.items[0]).toMatchObject({
			insert: "[[@taro/",
			from: 3,
			to: text.length,
		});
		expect(completion?.items[0]?.link).toBeUndefined();
	});

	it("[[@ハンドル/ のあとで、そのユーザーのレシピを出す。入れると「表示名の料理名」のリンクになる", () => {
		const text = "[[@taro/かれ";
		const completion = getRecipeTextCompletion(text, text.length, [], context);

		expect(completion?.items.map((item) => item.label)).toEqual([
			"カレー",
			"カレーうどん",
		]);
		expect(completion?.items[0]).toMatchObject({
			insert: "[[たろうのカレー]]",
			link: { label: "たろうのカレー", targetPublicId: "r1" },
		});

		if (!completion) throw new Error("候補が出ていません");

		expect(applyRecipeTextCompletion(text, completion, 0).text).toBe(
			"[[たろうのカレー]]",
		);
	});

	it("同じラベルが別のレシピに使われていれば、番号を付ける", () => {
		const text = "[[@taro/カレー";
		const completion = getRecipeTextCompletion(text, text.length, [], {
			...context,
			links: [{ label: "たろうのカレー", targetPublicId: "other" }],
		});

		expect(completion?.items[0]?.link?.label).toBe("たろうのカレー（2）");
	});

	it("others を渡さなければ、@ の補完は出ない（自分のレシピの絞り込みのまま）", () => {
		expect(
			getRecipeTextCompletion("[[@t", 4, [], { targets: [], links: [] }),
		).toBeNull();
	});

	it("候補がなければ、出さない", () => {
		expect(getRecipeTextCompletion("[[@zzz", 6, [], context)).toBeNull();
		expect(getRecipeTextCompletion("[[@jiro/", 8, [], context)).toBeNull();
	});
});
