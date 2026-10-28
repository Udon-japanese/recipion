import type { RecipeConsumptionRow } from "./plan-recipe-consumption";

// 引かなかった理由（同じ理由の材料は、1か所にまとめて見せる）。
export type SkippedReason = "no-stock" | "unmeasurable" | "presence-only";

export type SkippedGroup = {
	reason: SkippedReason;
	names: string[];
};

export type ConsumptionSummary = {
	// 引けなかった（通信の失敗など）。やり直しの対象。
	failed: RecipeConsumptionRow[];
	// 引いた（全部、または、ある分だけ）。
	deducted: RecipeConsumptionRow[];
	// 在庫にないが、代わりの食材を引ける。1行ずつ、ボタンを付けて見せる。
	hasAlternatives: RecipeConsumptionRow[];
	// 引かなかった材料。理由ごとにまとめる（理由の並びは固定）。
	skipped: SkippedGroup[];
};

const skippedOrder: readonly SkippedReason[] = [
	"no-stock",
	"unmeasurable",
	"presence-only",
];

// 引いた結果の行を、見せ方ごとに分ける。入力の順序は、各グループの中で保つ。
export function summarizeConsumptionRows(
	rows: readonly RecipeConsumptionRow[],
	failedNeedIds: ReadonlySet<string>,
): ConsumptionSummary {
	const summary: ConsumptionSummary = {
		failed: [],
		deducted: [],
		hasAlternatives: [],
		skipped: [],
	};
	const skippedNames = new Map<SkippedReason, string[]>();

	for (const row of rows) {
		if (failedNeedIds.has(row.need.id)) {
			summary.failed.push(row);
		} else if (row.status === "consume" || row.status === "partial") {
			summary.deducted.push(row);
		} else if (row.status === "no-stock" && row.alternatives.length > 0) {
			summary.hasAlternatives.push(row);
		} else {
			skippedNames.set(row.status, [
				...(skippedNames.get(row.status) ?? []),
				row.need.name,
			]);
		}
	}

	for (const reason of skippedOrder) {
		const names = skippedNames.get(reason);

		if (names) {
			summary.skipped.push({ reason, names });
		}
	}

	return summary;
}
