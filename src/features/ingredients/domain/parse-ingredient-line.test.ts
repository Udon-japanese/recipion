import { describe, expect, it } from "vitest";

import { parseIngredientLine } from "./parse-ingredient-line";

describe("parseIngredientLine", () => {
	it.each([
		["卵 1個", "卵", "1個", 1, "個"],
		["卵　1個", "卵", "1個", 1, "個"],
		["卵:1個", "卵", "1個", 1, "個"],
		["卵：1個", "卵", "1個", 1, "個"],
		["卵1個", "卵", "1個", 1, "個"],
		["牛乳200ml", "牛乳", "200ml", 200, "ml"],
		["しょうゆ 大さじ1", "しょうゆ", "大さじ1", 1, "大さじ"],
		["砂糖：小さじ1/2", "砂糖", "小さじ1/2", 0.5, "小さじ"],
		["玉ねぎ 1/2個", "玉ねぎ", "1/2個", 0.5, "個"],
		["だし 1 1/2カップ", "だし", "1 1/2カップ", 1.5, "カップ"],
		["しょうゆ 大さじ1と1/2", "しょうゆ", "大さじ1と1/2", 1.5, "大さじ"],
		["砂糖 小さじ２と1/4", "砂糖", "小さじ2と1/4", 2.25, "小さじ"],
		["薄力粉 約200g", "薄力粉", "約200g", 200, "g"],
		["5枚切り食パン 1枚", "5枚切り食パン", "1枚", 1, "枚"],
	])(
		"%sを食材名と使用量へ分割する",
		(input, name, amountText, quantity, unitLabel) => {
			expect(parseIngredientLine(input)).toEqual({
				status: "parsed",
				rawText: input,
				name,
				amountText,
				quantity,
				unitLabel,
			});
		},
	);

	it.each([
		["ベーコン 60~70g", "ベーコン", "60~70g", null, "g"],
		["醤油 大さじ4〜5", "醤油", "大さじ4〜5", null, "大さじ"],
		["豚こま肉 70から80g", "豚こま肉", "70から80g", null, "g"],
		["ベーコン 60-70g", "ベーコン", "60-70g", null, "g"],
		["ベーコン 60－70g", "ベーコン", "60-70g", null, "g"],
		["ベーコン 60ー70g", "ベーコン", "60ー70g", null, "g"],
		["豚こま肉 60−70g", "豚こま肉", "60−70g", null, "g"],
		["醤油 大さじ4-5", "醤油", "大さじ4-5", null, "大さじ"],
		["卵 1/2-1個", "卵", "1/2-1個", null, "個"],
		["輪切り唐辛子２本分位", "輪切り唐辛子", "2本分位", 2, "本"],
		["塩 小さじ1くらい", "塩", "小さじ1くらい", 1, "小さじ"],
		["水 100mlぐらい", "水", "100mlぐらい", 100, "ml"],
		["生姜チューブ3cm程度", "生姜チューブ", "3cm程度", 3, "cm"],
		["卵黄1つ", "卵黄", "1つ", 1, "つ"],
		["生姜チューブ3センチ程度", "生姜チューブ", "3センチ程度", 3, "cm"],
		["長ねぎ 10センチメートル", "長ねぎ", "10センチメートル", 10, "cm"],
		["鶏ひき肉 50グラム", "鶏ひき肉", "50グラム", 50, "g"],
		["水 100ミリ", "水", "100ミリ", 100, "ml"],
		["牛乳 200ミリリットル", "牛乳", "200ミリリットル", 200, "ml"],
		["じゃがいも 1キロ", "じゃがいも", "1キロ", 1, "kg"],
		["小麦粉 1キログラム", "小麦粉", "1キログラム", 1, "kg"],
		["だし 1リットル", "だし", "1リットル", 1, "l"],
	])(
		"%sの範囲や「位」付きの使用量を分量として区切る",
		(input, name, amountText, quantity, unitLabel) => {
			expect(parseIngredientLine(input)).toEqual({
				status: "parsed",
				rawText: input,
				name,
				amountText,
				quantity,
				unitLabel,
			});
		},
	);

	it.each([
		["塩 少々", "塩", "少々"],
		["バター 少し", "バター", "少し"],
		["オリーブオイル 少し", "オリーブオイル", "少し"],
		["塩胡椒とても少々", "塩胡椒", "とても少々"],
		["砂糖 ほんの少し", "砂糖", "ほんの少し"],
		["砂糖 とても少し", "砂糖", "とても少し"],
		["サラダ油 少量", "サラダ油", "少量"],
		["パセリ 適量", "パセリ", "適量"],
		["青のり 適宜", "青のり", "適宜"],
		["こしょう お好みで", "こしょう", "お好みで"],
	])("%sの数値化できない使用量も保持する", (input, name, amountText) => {
		expect(parseIngredientLine(input)).toEqual({
			status: "parsed",
			rawText: input,
			name,
			amountText,
			quantity: null,
			unitLabel: amountText === "ひとつまみ" ? "ひとつまみ" : null,
		});
	});

	it.each([
		[
			"☆ケチャップ 適量(色がつくくらい、大さじ２〜３)",
			"☆ケチャップ",
			"適量(色がつくくらい、大さじ2〜3)",
			null,
			null,
		],
		["豆腐 1丁(300g)", "豆腐", "1丁(300g)", 1, "丁"],
	])(
		"分量のあとの括弧つきの補足は、分量の原文に残し、数量には使わない（%s）",
		(input, name, amountText, quantity, unitLabel) => {
			expect(parseIngredientLine(input)).toEqual({
				status: "parsed",
				rawText: input,
				name,
				amountText,
				quantity,
				unitLabel,
			});
		},
	);

	it("名前の括弧は、分量がなければ、名前の一部のまま", () => {
		expect(parseIngredientLine("ソーセージ(ベーコン)")).toMatchObject({
			status: "missing-amount",
			name: "ソーセージ(ベーコン)",
		});
	});

	it("使用量がなければ未解析として食材名を保持する", () => {
		expect(parseIngredientLine("肉だね")).toEqual({
			status: "missing-amount",
			rawText: "肉だね",
			name: "肉だね",
			amountText: null,
			quantity: null,
			unitLabel: null,
		});
	});

	it("空行は無視する", () => {
		expect(parseIngredientLine("　 ")).toBeNull();
	});

	it("お好みで少々をひとつの分量として扱う", () => {
		expect(parseIngredientLine("大葉 お好みで少々")).toMatchObject({
			status: "parsed",
			name: "大葉",
			amountText: "お好みで少々",
			quantity: null,
			unitLabel: null,
		});
	});
});

describe("parseIngredientLine（漢数字の分量）", () => {
	it.each([
		["鮭 一切れ", "鮭", "一切れ", 1, "切れ"],
		["鮭一切れ", "鮭", "一切れ", 1, "切れ"],
		["卵 二個", "卵", "二個", 2, "個"],
		["ミニトマト 十二個", "ミニトマト", "十二個", 12, "個"],
		["ごぼう 二十本", "ごぼう", "二十本", 20, "本"],
		["米 一合", "米", "一合", 1, "合"],
		["キャベツ 半玉", "キャベツ", "半玉", 0.5, "玉"],
		["大根 二分の一本", "大根", "二分の一本", 0.5, "本"],
		["だし 一と二分の一カップ", "だし", "一と二分の一カップ", 1.5, "カップ"],
		["しょうゆ 大さじ二", "しょうゆ", "大さじ二", 2, "大さじ"],
		["砂糖 小さじ二分の一", "砂糖", "小さじ二分の一", 0.5, "小さじ"],
		["輪切り唐辛子 二本分位", "輪切り唐辛子", "二本分位", 2, "本"],
		["ミツバ 約三つ", "ミツバ", "約三つ", 3, "つ"],
	])(
		"%sを、漢数字のまま分量の原文に残して、数量と単位を読む",
		(input, name, amountText, quantity, unitLabel) => {
			expect(parseIngredientLine(input)).toEqual({
				status: "parsed",
				rawText: input,
				name,
				amountText,
				quantity,
				unitLabel,
			});
		},
	);

	it.each([
		["ベーコン 二〜三枚", "ベーコン", "二〜三枚", "枚"],
		["醤油 大さじ二〜三", "醤油", "大さじ二〜三", "大さじ"],
	])(
		"%sの範囲は、数量にしない（原文は残る）",
		(input, name, amountText, unitLabel) => {
			expect(parseIngredientLine(input)).toMatchObject({
				status: "parsed",
				name,
				amountText,
				quantity: null,
				unitLabel,
			});
		},
	);

	it("分量のあとの括弧つきの補足も、漢数字の分量と一緒に残す", () => {
		expect(parseIngredientLine("豆腐 一丁(300g)")).toMatchObject({
			status: "parsed",
			name: "豆腐",
			amountText: "一丁(300g)",
			quantity: 1,
			unitLabel: "丁",
		});
	});

	it.each([
		"三つ葉",
		"一味唐辛子",
		"七味唐辛子",
		"二十日大根",
		"十六穀米",
		"一番だし",
		"五目豆",
	])("名前の中の漢数字（%s）は、分量として読まない", (name) => {
		expect(parseIngredientLine(name)).toMatchObject({
			status: "missing-amount",
			name,
		});
	});

	it("名前の中の漢数字があっても、行の終わりの分量だけを読む", () => {
		expect(parseIngredientLine("三つ葉 一束")).toMatchObject({
			status: "parsed",
			name: "三つ葉",
			amountText: "一束",
			quantity: 1,
			unitLabel: "束",
		});
		expect(parseIngredientLine("一味唐辛子 小さじ半")).toMatchObject({
			status: "parsed",
			name: "一味唐辛子",
			quantity: 0.5,
			unitLabel: "小さじ",
		});
	});
});

describe("parseIngredientLine（名前の中のハイフン）", () => {
	it.each([
		["ミニ-トマト 2個", "ミニ-トマト", "2個", 2, "個"],
		["ほうれん草-ゆで 1束", "ほうれん草-ゆで", "1束", 1, "束"],
		["コーヒー 200ml", "コーヒー", "200ml", 200, "ml"],
	])(
		"%sの名前は、範囲の区切りに巻き込まない",
		(input, name, amountText, quantity, unitLabel) => {
			expect(parseIngredientLine(input)).toMatchObject({
				status: "parsed",
				name,
				amountText,
				quantity,
				unitLabel,
			});
		},
	);
});

describe("parseIngredientLine（リンク先の割合）", () => {
	it.each([
		["[[ドレッシング]] 半分", "[[ドレッシング]]", "半分", 0.5, "量"],
		["[[ドレッシング]]半分", "[[ドレッシング]]", "半分", 0.5, "量"],
		["[[ドレッシング]] 全量", "[[ドレッシング]]", "全量", 1, "量"],
		["[[ドレッシング]] 半量", "[[ドレッシング]]", "半量", 0.5, "量"],
		["[[ドレッシング]] 1/3量", "[[ドレッシング]]", "1/3量", 1 / 3, "量"],
		["[[ドレッシング]] 1/3", "[[ドレッシング]]", "1/3", 1 / 3, null],
		["[[ドレッシング]] 2倍", "[[ドレッシング]]", "2倍", 2, "倍"],
		["[[カレー]] 1.5倍", "[[カレー]]", "1.5倍", 1.5, "倍"],
		["[[カレー]] 2人分", "[[カレー]]", "2人分", 2, "人分"],
		["[[カレー]] 二倍", "[[カレー]]", "二倍", 2, "倍"],
	])("%sを、割合として読む", (input, name, amountText, quantity, unitLabel) => {
		expect(parseIngredientLine(input)).toEqual({
			status: "parsed",
			rawText: input,
			name,
			amountText,
			quantity,
			unitLabel,
		});
	});

	it("単位のない整数や、名前の中の「半分」は、分量にしない", () => {
		expect(parseIngredientLine("牛乳 2")?.status).toBe("missing-amount");
		expect(parseIngredientLine("半分")?.status).toBe("missing-amount");
	});
});
