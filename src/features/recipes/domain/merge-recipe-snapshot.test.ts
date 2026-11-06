import { describe, expect, it } from "vitest";
import {
	applyMergedSnapshot,
	countConflicts,
	mergeRecipeSnapshots,
	mergeSnapshotSection,
	resolveSectionText,
} from "./merge-recipe-snapshot";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import type { RecipeSnapshot } from "./recipe-snapshot";

function lines(...values: string[]) {
	return values.join("\n");
}

// スタンダードなケークサレ（親）から、チーズ鮭（子）を作った。
const base = lines(
	"薄力粉 100g",
	"卵 2個",
	"牛乳 100ml",
	"ベーコン 50g",
	"塩 少々",
);
const mine = lines(
	"薄力粉 100g",
	"卵 2個",
	"牛乳 100ml",
	"塩 少々",
	"鮭 1切れ",
	"チーズ 30g",
);

describe("mergeSnapshotSection", () => {
	it.each([
		{
			title: "親だけが変えた行は当て、子が足した行・消した行は残す",
			parent: lines(
				"薄力粉 100g",
				"卵 2個",
				"牛乳 120ml",
				"ベーコン 50g",
				"塩 少々",
			),
			expected: lines(
				"薄力粉 100g",
				"卵 2個",
				"牛乳 120ml",
				"塩 少々",
				"鮭 1切れ",
				"チーズ 30g",
			),
		},
		{
			title: "親が足した行も入る（子が消した行は、消えたまま）",
			parent: lines(
				"薄力粉 100g",
				"ベーキングパウダー 小さじ1",
				"卵 2個",
				"牛乳 100ml",
				"ベーコン 50g",
				"塩 少々",
			),
			expected: lines(
				"薄力粉 100g",
				"ベーキングパウダー 小さじ1",
				"卵 2個",
				"牛乳 100ml",
				"塩 少々",
				"鮭 1切れ",
				"チーズ 30g",
			),
		},
		{
			title: "親と子が同じに変えた行は、ぶつからない",
			parent: lines("薄力粉 100g", "卵 2個", "牛乳 100ml", "塩 少々"),
			expected: mine,
		},
	])("$title", ({ parent, expected }) => {
		const blocks = mergeSnapshotSection(base, parent, mine);

		expect(blocks.some((block) => block.kind === "conflict")).toBe(false);
		expect(resolveSectionText(blocks, [])).toBe(expected);
	});

	it("両方が同じ行を違うように変えたら、ぶつかりにして、選んだほうにする", () => {
		const myEdit = mine.replace("牛乳 100ml", "豆乳 100ml");
		const parent = base.replace("牛乳 100ml", "牛乳 120ml");
		const blocks = mergeSnapshotSection(base, parent, myEdit);

		// 子の「豆乳に変えた」と「すぐ下のベーコンを消した」は、隣り合うので、1つの変更として比べる
		// （親の側は、その範囲の今の親の行。どちらにするかを、本人が選ぶ）。
		expect(blocks.filter((block) => block.kind === "conflict")).toEqual([
			{
				kind: "conflict",
				parent: ["牛乳 120ml", "ベーコン 50g"],
				mine: ["豆乳 100ml"],
			},
		]);
		// ぶつかりの外の、子が足した行は、そのまま残る。
		expect(resolveSectionText(blocks, ["mine"])).toBe(
			lines(
				"薄力粉 100g",
				"卵 2個",
				"豆乳 100ml",
				"塩 少々",
				"鮭 1切れ",
				"チーズ 30g",
			),
		);
		expect(resolveSectionText(blocks, [])).toBeNull();
		expect(resolveSectionText(blocks, ["parent"])).toContain("牛乳 120ml");
		expect(resolveSectionText(blocks, ["mine"])).toContain("豆乳 100ml");
		expect(resolveSectionText(blocks, ["both"])).toContain(
			lines("豆乳 100ml", "牛乳 120ml"),
		);
	});

	it.each([
		{
			title: "同じ位置に、両方が違う行を足した",
			base: lines("卵 2個", "塩 少々"),
			parent: lines("卵 2個", "砂糖 小さじ1", "塩 少々"),
			mine: lines("卵 2個", "胡椒 少々", "塩 少々"),
			conflict: { parent: ["砂糖 小さじ1"], mine: ["胡椒 少々"] },
		},
		{
			title: "子が直した行を、親が消した",
			base: lines("卵 2個", "ベーコン 50g", "塩 少々"),
			parent: lines("卵 2個", "塩 少々"),
			mine: lines("卵 2個", "ベーコン 80g", "塩 少々"),
			conflict: { parent: [], mine: ["ベーコン 80g"] },
		},
	])("ぶつかり：$title", ({ base, parent, mine, conflict }) => {
		expect(
			mergeSnapshotSection(base, parent, mine).filter(
				(block) => block.kind === "conflict",
			),
		).toEqual([{ kind: "conflict", ...conflict }]);
	});

	it("空の部分も扱える（親が、メモを書き足した）", () => {
		expect(
			resolveSectionText(mergeSnapshotSection("", "焼きすぎない", ""), []),
		).toBe("焼きすぎない");
	});
});

function snapshot(overrides: Partial<RecipeSnapshot>): RecipeSnapshot {
	return {
		yieldText: "1台",
		ingredients: base,
		preparations: "",
		instructions: lines("1. 混ぜる", "2. 焼く"),
		note: "",
		...overrides,
	};
}

describe("mergeRecipeSnapshots", () => {
	it("写しのあとで親が変わった部分だけを、まとめる", () => {
		const merges = mergeRecipeSnapshots({
			base: snapshot({}),
			parent: snapshot({ instructions: lines("1. 混ぜる", "2. 180℃で焼く") }),
			mine: snapshot({ ingredients: mine }),
		});

		expect(merges.map((merge) => merge.section)).toEqual(["instructions"]);
		expect(countConflicts(merges)).toBe(0);
	});
});

describe("applyMergedSnapshot", () => {
	it("変わった部分だけを読み直し、材料の増減のしかたは、子の材料名で引き継ぐ", () => {
		let sequence = 0;
		const createId = () => `id-${++sequence}`;
		const created = createRecipeEditorDocument(
			{
				name: "チーズ鮭のケークサレ",
				ingredientText: mine,
				instructionText: "1. 混ぜる\n2. 焼く",
			},
			createId,
		);
		const child = {
			...created,
			ingredients: created.ingredients.map((node) =>
				node.type === "ingredient" && node.name === "塩"
					? { ...node, scaleWeight: 0.5 }
					: node,
			),
		};
		const merged = applyMergedSnapshot(
			child,
			{
				yieldText: child.yieldText,
				ingredients: mine.replace("牛乳 100ml", "牛乳 120ml"),
				preparations: "",
				instructions: "1. 混ぜる\n2. 焼く",
				note: "",
			},
			createId,
		);

		expect(
			merged.ingredients.map((node) =>
				node.type === "ingredient"
					? [node.name, node.amountText, node.scaleWeight]
					: null,
			),
		).toEqual([
			["薄力粉", "100g", undefined],
			["卵", "2個", undefined],
			["牛乳", "120ml", undefined],
			["塩", "少々", 0.5],
			["鮭", "1切れ", undefined],
			["チーズ", "30g", undefined],
		]);
		// 作り方は変わらないので、子の中身（ID も）のまま。
		expect(merged.instructions).toBe(child.instructions);
		expect(merged.name).toBe("チーズ鮭のケークサレ");
	});
});
