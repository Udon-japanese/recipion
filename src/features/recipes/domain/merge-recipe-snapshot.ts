// レシピの継承：親の変更を、子へ取り込む（部分ごとに、行の3者比較）。
// もと＝写したときの親、相手＝今の親、自分＝今の子。親だけが変えた行は当て、子だけが変えた行は残す。
// 両方が同じところを違うように変えたときだけ、ぶつかり（どれにするかを、本人が選ぶ）。
import { diffIndices } from "node-diff3";
import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import {
	createRecipeSnapshot,
	findChangedSnapshotSections,
	type RecipeSnapshot,
	type RecipeSnapshotSection,
} from "./recipe-snapshot";

// ok の source：base＝どちらも変えていない行／parent＝親の変更を当てた行／mine＝子で直した行（残す）。
export type MergeBlock =
	| { kind: "ok"; source: "base" | "parent" | "mine"; lines: string[] }
	| { kind: "conflict"; parent: string[]; mine: string[] };

// ぶつかりの選び方：今の親の行／自分の行／両方（自分の行のあとに、親の行）。
export type ConflictChoice = "parent" | "mine" | "both";

export type SectionMerge = {
	section: RecipeSnapshotSection;
	blocks: MergeBlock[];
};

function toLines(text: string): string[] {
	return text === "" ? [] : text.split("\n");
}

// もとの文章からの、1つの変更（もとの start から count 行を、lines に置き換える。count 0 は、差し込み）。
type Change = {
	side: "parent" | "mine";
	start: number;
	count: number;
	lines: string[];
};

function changesOf(
	base: readonly string[],
	edited: readonly string[],
	side: Change["side"],
): Change[] {
	return diffIndices([...base], [...edited]).map((hunk) => ({
		side,
		start: hunk.buffer1[0],
		count: hunk.buffer1[1],
		lines: hunk.buffer2Content,
	}));
}

// もとの文章の start〜end の範囲に、変更を当てた行。
function applyChanges(
	base: readonly string[],
	start: number,
	end: number,
	changes: readonly Change[],
): string[] {
	const result: string[] = [];
	let position = start;

	for (const change of changes) {
		result.push(...base.slice(position, change.start), ...change.lines);
		position = change.start + change.count;
	}

	result.push(...base.slice(position, end));

	return result;
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((line, index) => line === b[index]);
}

// 1つの部分を、行ごとに比べてまとめる（3者比較）。
// 親の変更と子の変更を、もとの文章の位置で並べ、同じ行にかかる変更どうしだけを、ひとまとまりにする。
// 隣り合う行の変更（親が「牛乳」の行を直し、子がすぐ下の「ベーコン」の行を消した）は、ぶつからない。
// ただし、同じ位置への差し込みと、そこでの変更は、順番が決まらないので、ひとまとまりにする。
// ひとまとまりの中に、親と子の両方の変更があり、結果が違うときだけ、ぶつかり。
export function mergeSnapshotSection(
	baseText: string,
	parentText: string,
	mineText: string,
): MergeBlock[] {
	const base = toLines(baseText);
	const changes = [
		...changesOf(base, toLines(parentText), "parent"),
		...changesOf(base, toLines(mineText), "mine"),
	].sort((a, b) => a.start - b.start || a.count - b.count);

	const clusters: Change[][] = [];
	let clusterEnd = -1;

	for (const change of changes) {
		const last = clusters.at(-1);
		const lastChange = last?.at(-1);
		const overlaps =
			last !== undefined &&
			lastChange !== undefined &&
			(change.start < clusterEnd ||
				(change.start === clusterEnd &&
					(change.count === 0 || lastChange.count === 0) &&
					change.start === lastChange.start + lastChange.count));

		if (last && overlaps) {
			last.push(change);
			clusterEnd = Math.max(clusterEnd, change.start + change.count);
		} else {
			clusters.push([change]);
			clusterEnd = change.start + change.count;
		}
	}

	const blocks: MergeBlock[] = [];
	let position = 0;

	function pushOk(
		lines: readonly string[],
		source: "base" | "parent" | "mine",
	) {
		if (lines.length === 0) {
			return;
		}

		const last = blocks.at(-1);

		if (last?.kind === "ok" && last.source === source) {
			last.lines.push(...lines);
		} else {
			blocks.push({ kind: "ok", source, lines: [...lines] });
		}
	}

	for (const cluster of clusters) {
		const start = Math.min(...cluster.map((change) => change.start));
		const end = Math.max(
			...cluster.map((change) => change.start + change.count),
		);
		const parentChanges = cluster.filter((change) => change.side === "parent");
		const mineChanges = cluster.filter((change) => change.side === "mine");
		const parentLines = applyChanges(base, start, end, parentChanges);
		const mineLines = applyChanges(base, start, end, mineChanges);

		pushOk(base.slice(position, start), "base");

		if (parentChanges.length === 0) {
			pushOk(mineLines, "mine");
		} else if (mineChanges.length === 0) {
			pushOk(parentLines, "parent");
		} else if (sameLines(parentLines, mineLines)) {
			pushOk(mineLines, "mine");
		} else {
			blocks.push({ kind: "conflict", parent: parentLines, mine: mineLines });
		}

		position = end;
	}

	pushOk(base.slice(position), "base");

	return blocks;
}

// 写しのあとで親が変わった部分だけを、まとめる。
export function mergeRecipeSnapshots(input: {
	base: RecipeSnapshot;
	parent: RecipeSnapshot;
	mine: RecipeSnapshot;
}): SectionMerge[] {
	return findChangedSnapshotSections(input.base, input.parent).map(
		(section) => ({
			section,
			blocks: mergeSnapshotSection(
				input.base[section],
				input.parent[section],
				input.mine[section],
			),
		}),
	);
}

export function countConflicts(merges: readonly SectionMerge[]): number {
	return merges.reduce(
		(total, merge) =>
			total + merge.blocks.filter((block) => block.kind === "conflict").length,
		0,
	);
}

// 選んだ結果の文章。choices は、部分ごとに、ぶつかりの順の選び方（選んでいないものがあれば null）。
export function resolveSectionText(
	blocks: readonly MergeBlock[],
	choices: readonly (ConflictChoice | undefined)[],
): string | null {
	const lines: string[] = [];
	let conflictIndex = 0;

	for (const block of blocks) {
		if (block.kind === "ok") {
			lines.push(...block.lines);
			continue;
		}

		const choice = choices[conflictIndex];

		conflictIndex += 1;

		if (choice === undefined) {
			return null;
		}

		if (choice === "mine" || choice === "both") {
			lines.push(...block.mine);
		}

		if (choice === "parent" || choice === "both") {
			lines.push(...block.parent);
		}
	}

	return lines.join("\n");
}

function normalizeName(name: string): string {
	return name.normalize("NFKC").trim();
}

function collectWeights(
	nodes: readonly RecipeEditorIngredientNode[],
	weights: Map<string, number>,
): Map<string, number> {
	for (const node of nodes) {
		if (node.type === "group") {
			collectWeights(node.children, weights);
		} else if (node.scaleWeight !== undefined) {
			weights.set(normalizeName(node.name), node.scaleWeight);
		}
	}

	return weights;
}

function applyWeights(
	nodes: readonly RecipeEditorIngredientNode[],
	weights: ReadonlyMap<string, number>,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) => {
		if (node.type === "group") {
			return { ...node, children: applyWeights(node.children, weights) };
		}

		const weight = weights.get(normalizeName(node.name));

		return weight === undefined ? node : { ...node, scaleWeight: weight };
	});
}

// 取り込んだ結果を、子のレシピの中身にする（エディタで開いて、本人が保存する）。
// 変わらなかった部分は、子の中身をそのまま使う。材料の増減のしかたは、子の材料名で引き継ぐ（親の設定は取り込まない）。
export function applyMergedSnapshot(
	child: RecipeEditorDocument,
	merged: RecipeSnapshot,
	createId: () => string = () => crypto.randomUUID(),
): RecipeEditorDocument {
	const current = createRecipeSnapshot(child);
	const parsed = createRecipeEditorDocument(
		{
			ingredientText: merged.ingredients,
			preparationText: merged.preparations,
			instructionText: merged.instructions,
		},
		createId,
	);

	return {
		...child,
		yieldText:
			merged.yieldText.trim() === "" ? child.yieldText : merged.yieldText,
		ingredients:
			merged.ingredients === current.ingredients
				? child.ingredients
				: applyWeights(
						parsed.ingredients,
						collectWeights(child.ingredients, new Map()),
					),
		preparations:
			merged.preparations === current.preparations
				? child.preparations
				: parsed.preparations,
		instructions:
			merged.instructions === current.instructions
				? child.instructions
				: parsed.instructions,
		note: merged.note,
	};
}
