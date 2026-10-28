import { describe, expect, it } from "vitest";
import type {
	RecipeConsumptionRow,
	RecipeConsumptionStatus,
} from "./plan-recipe-consumption";
import { summarizeConsumptionRows } from "./summarize-consumption-rows";

function row(
	name: string,
	status: RecipeConsumptionStatus,
	alternatives = 0,
): RecipeConsumptionRow {
	return {
		need: { id: name, name, quantity: 1, unitLabel: null, amountText: null },
		status,
		target: null,
		deduct: null,
		required: null,
		viaStandIn: false,
		alternatives: Array.from({ length: alternatives }, (_, index) => ({
			inventoryItemId: `alt-${name}-${index}`,
			name: `代わりの${name}`,
			stockUnitCode: "count",
			stockUnitLabel: "個",
			deduct: 1,
		})),
	};
}

describe("summarizeConsumptionRows", () => {
	it("引いたものは、順序を保って、そのまま並べる（全部でも、ある分だけでも）", () => {
		const summary = summarizeConsumptionRows(
			[row("玉ねぎ", "consume"), row("卵", "partial")],
			new Set(),
		);

		expect(summary.deducted.map((r) => r.need.name)).toEqual(["玉ねぎ", "卵"]);
		expect(summary.skipped).toEqual([]);
	});

	it("引かなかった材料は、理由ごとに、名前を1か所にまとめる（理由の並びは固定）", () => {
		const summary = summarizeConsumptionRows(
			[
				row("塩", "presence-only"),
				row("卵", "no-stock"),
				row("胡椒", "unmeasurable"),
				row("牛乳", "no-stock"),
			],
			new Set(),
		);

		expect(summary.skipped).toEqual([
			{ reason: "no-stock", names: ["卵", "牛乳"] },
			{ reason: "unmeasurable", names: ["胡椒"] },
			{ reason: "presence-only", names: ["塩"] },
		]);
	});

	it("代わりの食材を引ける行は、まとめず、1行ずつ残す（ボタンを付けるため）", () => {
		const summary = summarizeConsumptionRows(
			[row("玉ねぎ", "no-stock", 1), row("卵", "no-stock")],
			new Set(),
		);

		expect(summary.hasAlternatives.map((r) => r.need.name)).toEqual(["玉ねぎ"]);
		expect(summary.skipped).toEqual([{ reason: "no-stock", names: ["卵"] }]);
	});

	it("引けなかった行は、理由によらず、先に分ける（やり直しの対象）", () => {
		const summary = summarizeConsumptionRows(
			[row("玉ねぎ", "consume"), row("卵", "consume")],
			new Set(["卵"]),
		);

		expect(summary.failed.map((r) => r.need.name)).toEqual(["卵"]);
		expect(summary.deducted.map((r) => r.need.name)).toEqual(["玉ねぎ"]);
	});
});
