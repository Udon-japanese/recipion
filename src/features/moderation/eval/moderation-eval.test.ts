import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AiJudge } from "../application/ai-judge";
import { createAiJudge } from "../application/ai-judge";
import { moderateContent } from "../application/moderate-content";
import type { ModerationResult } from "../domain/moderation-result";
import { normalizeForModeration } from "../domain/normalize-text";
import { createWorkersAiRestRunner } from "../infrastructure/workers-ai-rest-runner";
import { embedInRecipeContext, generateVariants } from "./mutate-text";

// 実際のモデルで、判定の精度を確かめる（手動。`pnpm test` では、動かさない）。手順は、moderation-eval/README.md。
const isEnabled = process.env.RUN_MODERATION_EVAL === "1";

function readLines(path: string): string[] {
	return existsSync(path)
		? readFileSync(path, "utf8")
				.split(/\r?\n/u)
				.map((line) => line.trim())
				.filter((line) => line !== "" && !line.startsWith("#"))
		: [];
}

function readBlocks(path: string): string[] {
	return readFileSync(path, "utf8")
		.split(/^---$/mu)
		.map((block) =>
			block
				.split(/\r?\n/u)
				.filter((line) => !line.startsWith("#"))
				.join("\n")
				.trim(),
		)
		.filter((block) => block !== "");
}

// 判定に失敗した理由ごとの、回数。
const judgeErrors = new Map<string, number>();
// 消費した Neurons（Workers AI の無料枠は、1日 10,000）。
let usedNeurons = 0;
// 無料枠の上限に達したら、無駄な呼び出しをやめて、評価全体を止める。
let quotaExhausted = false;

const quotaPattern = /daily free allocation|4006/u;

function createEvalJudge(): AiJudge {
	if (process.env.MODERATION_EVAL_LEXICON_ONLY === "1") {
		// 語の一覧だけ：AI は、すべて ok と答えたことにする（一覧に当たらないものが、そのまま通る）。
		return async (items) =>
			items.map(() => ({ verdict: "ok", category: "other" }));
	}

	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;
	const model = process.env.MODERATION_EVAL_MODEL;

	if (!accountId || !apiToken || !model) {
		throw new Error(
			"CLOUDFLARE_ACCOUNT_ID・CLOUDFLARE_API_TOKEN・MODERATION_EVAL_MODEL を、moderation-eval/eval.env.local に書いてください",
		);
	}

	const runner = createWorkersAiRestRunner({
		accountId,
		apiToken,
		model,
		tokenLimitParam: model.includes("gemma")
			? "max_completion_tokens"
			: "max_tokens",
		// gemma 4 は、答える前に長い「思考」を出力し、回答の長さの上限を使い切って、本文が空になる。思考を切る。
		onUsage: (neurons) => {
			usedNeurons += neurons;
		},
		extraBody: model.includes("gemma")
			? { chat_template_kwargs: { enable_thinking: false } }
			: {},
	});

	// 失敗した理由（と、応答の先頭）を、集計して、結果に出す（判定できなかった理由が、分からなくならないように）。
	return async (items) => {
		let response = "";

		if (quotaExhausted) {
			throw new Error("Workers AI の無料枠の上限に達しています");
		}

		try {
			return await createAiJudge(async (request) => {
				response = await runner(request);

				return response;
			})(items);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);

			if (quotaPattern.test(message)) {
				quotaExhausted = true;
			}
			const key = `${message}｜応答の先頭：${response.slice(0, 200).replace(/\n/gu, " ⏎ ")}`;

			judgeErrors.set(key, (judgeErrors.get(key) ?? 0) + 1);

			throw error;
		}
	};
}

async function mapWithConcurrency<T, R>(
	values: readonly T[],
	limit: number,
	run: (value: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(values.length);
	let next = 0;

	await Promise.all(
		Array.from({ length: Math.min(limit, values.length) }, async () => {
			while (next < values.length) {
				const index = next;

				next += 1;
				results[index] = await run(values[index] as T);
			}
		}),
	);

	return results;
}

// 同じ入力から、いつも同じ標本を選ぶための、簡単なハッシュ。
function hashText(text: string): number {
	let hash = 2166136261;

	for (const char of text) {
		hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
	}

	return hash >>> 0;
}

// 表記の違い（全角半角・ひらがなカタカナ・区切り）を除いて、同じ文章を、1つにまとめる。
// 絵文字だけの文章が、区切りと一緒に消えて、同じ（空）になるのを避けるため、絵文字も含めて比べる。
function textKey(text: string): string {
	const normalized = normalizeForModeration(text);

	// 記号だけの文章は、区切りと一緒に消えて、すべて同じ（空）になるので、そのままの文字で比べる。
	return normalized.compact === "" && normalized.emoji === ""
		? `raw:${normalized.text.trim()}`
		: `${normalized.compact}|${normalized.emoji}`;
}

function dedupe(texts: readonly string[]): string[] {
	return [...new Map(texts.map((text) => [textKey(text), text])).values()];
}

type Entry = { text: string; target: "recipe-note" | "recipe-instruction" };

const okJudge: AiJudge = async (items) =>
	items.map(() => ({ verdict: "ok", category: "other" }));

describe.skipIf(!isEnabled)("文章の判定の評価", () => {
	it(
		"よい文章を通し、悪い文章（書き換えを含む）を止める",
		async () => {
			const isLexiconOnly = process.env.MODERATION_EVAL_LEXICON_ONLY === "1";
			const judge = createEvalJudge();
			// AI の評価は、無料枠（1日 10,000 Neurons）に収めるため、標本を絞り、まとめて問い合わせる。
			// 語の一覧だけの評価は、安いので、書き換えを、すべて試す。
			const perSeed = Number(process.env.MODERATION_EVAL_PER_SEED ?? "") || 3;
			const batchSize = Number(process.env.MODERATION_EVAL_BATCH ?? "") || 10;
			const limit =
				Number(process.env.MODERATION_EVAL_LIMIT ?? "") ||
				Number.POSITIVE_INFINITY;

			// かならず通したい文章：moderation-eval/ok-samples*.txt（複数のファイルを、まとめて読む。重複は除く）。
			const okSamples = dedupe(
				readdirSync("moderation-eval")
					.filter((name) => /^ok-samples.*\.txt$/u.test(name))
					.sort()
					.flatMap((name) => readBlocks(`moderation-eval/${name}`)),
			);
			const borderlineSamples = existsSync(
				"moderation-eval/borderline-samples.txt",
			)
				? readBlocks("moderation-eval/borderline-samples.txt")
				: [];
			// 悪い語の元：ng-seeds*.local（複数のファイルを、まとめて読む）。
			const rawSeeds = readdirSync("moderation-eval")
				.filter((name) => /^ng-seeds.*\.local$/u.test(name))
				.sort()
				.flatMap((name) => readLines(`moderation-eval/${name}`));
			const rawDirect = readLines("moderation-eval/ng-samples.local");
			const seeds = dedupe(rawSeeds);
			const ngDirect = dedupe(rawDirect);

			const ngSamples = [
				...seeds.flatMap((seed) => {
					const variants = generateVariants(seed);
					// AI の評価：そのまま＋書き換え perSeed 件（元の語ごとに、決まった標本）、作り方の途中だけ。
					const picked = isLexiconOnly
						? variants
						: [
								...variants.filter((variant) => variant.kind === "そのまま"),
								...variants
									.filter((variant) => variant.kind !== "そのまま")
									.sort((a, b) => hashText(a.text) - hashText(b.text))
									.slice(0, perSeed),
							];

					return picked.flatMap((variant) =>
						embedInRecipeContext(variant.text)
							.filter(
								(embedded) => isLexiconOnly || embedded.kind === "作り方の途中",
							)
							.map((embedded) => ({
								label: `${seed}／${variant.kind}／${embedded.kind}`,
								kind: variant.kind,
								text: embedded.text,
							})),
					);
				}),
				...ngDirect.map((text) => ({
					label: "手元の例",
					kind: "手元の例",
					text,
				})),
			].slice(0, limit);

			// 1文ずつ審査した結果を返す。確定の語は、1文ずつ見て、AI には、残りだけを、まとめて渡す。
			async function judgeMany(
				entries: readonly Entry[],
			): Promise<ModerationResult[]> {
				const results: ModerationResult[] = new Array(entries.length);
				const pending: number[] = [];

				for (const [index, entry] of entries.entries()) {
					const lexiconResult = await moderateContent([entry], okJudge);

					if (lexiconResult.decision === "block") {
						results[index] = lexiconResult;
					} else {
						pending.push(index);
					}
				}

				const batches: number[][] = [];

				for (let start = 0; start < pending.length; start += batchSize) {
					batches.push(pending.slice(start, start + batchSize));
				}

				await mapWithConcurrency(batches, 2, async (batch) => {
					const captured: Awaited<ReturnType<AiJudge>> = [];
					const result = await moderateContent(
						batch.map((index) => entries[index] as Entry),
						async (items) => {
							const verdicts = await judge(items);

							captured.push(...verdicts);

							return verdicts;
						},
					);

					for (const [position, index] of batch.entries()) {
						const verdict = captured[position];

						results[index] =
							result.decision === "unavailable" || !verdict
								? { decision: "unavailable" }
								: verdict.verdict === "ok"
									? { decision: "allow" }
									: {
											decision: verdict.verdict === "ng" ? "block" : "flag",
											reasons: [
												{
													target: (entries[index] as Entry).target,
													source: "ai",
													category: verdict.category,
												},
											],
										};
					}
				});

				return results;
			}

			// 同じ文章が、複数の区分に入っていないか（入っていると、評価が矛盾する）。
			const keyGroups = new Map<string, Set<string>>();
			const register = (group: string, texts: readonly string[]) => {
				for (const text of texts) {
					const key = textKey(text);
					const groups = keyGroups.get(key) ?? new Set<string>();

					groups.add(group);
					keyGroups.set(key, groups);
				}
			};

			register("ok-samples", okSamples);
			register("borderline-samples", borderlineSamples);
			register("ng", [...seeds, ...ngDirect]);

			const duplicates = [...keyGroups.entries()].filter(
				([, groups]) => groups.size > 1,
			);

			const attach = <T extends { text: string }>(
				values: readonly T[],
				results: readonly ModerationResult[],
			) =>
				values.map((value, index) => ({
					...value,
					result: results[index] as ModerationResult,
				}));

			const borderlineResults = attach(
				borderlineSamples.map((text) => ({ text })),
				await judgeMany(
					borderlineSamples.map((text) => ({
						text,
						target: "recipe-instruction" as const,
					})),
				),
			);
			const okResults = attach(
				okSamples.map((text) => ({ text })),
				await judgeMany(
					okSamples.map((text) => ({
						text,
						target: "recipe-instruction" as const,
					})),
				),
			);
			const ngResults = attach(
				ngSamples,
				await judgeMany(
					ngSamples.map(({ text }) => ({
						text,
						target: "recipe-note" as const,
					})),
				),
			);

			if (quotaExhausted) {
				throw new Error(
					"Workers AI の1日の無料枠（10,000 Neurons）を使い切っています。リセット（UTC の 0 時＝日本時間の 9 時）のあとに、もう一度、実行してください。結果のファイルは、書きません。",
				);
			}

			const count = (
				results: { result: ModerationResult }[],
				decision: string,
			) => results.filter((entry) => entry.result.decision === decision).length;

			// 書き換えの種類ごとの結果（語の中身は、出さない）。
			const byKind = new Map<
				string,
				{
					total: number;
					lexicon: number;
					ai: number;
					flag: number;
					allow: number;
				}
			>();

			for (const entry of ngResults) {
				const row = byKind.get(entry.kind) ?? {
					total: 0,
					lexicon: 0,
					ai: 0,
					flag: 0,
					allow: 0,
				};
				const { result } = entry;

				row.total += 1;

				if (result.decision === "block") {
					if (result.reasons[0]?.source === "ai") {
						row.ai += 1;
					} else {
						row.lexicon += 1;
					}
				} else if (result.decision === "flag") {
					row.flag += 1;
				} else if (result.decision === "allow") {
					row.allow += 1;
				}

				byKind.set(entry.kind, row);
			}

			const kindTable = [...byKind.entries()]
				.sort((a, b) => b[1].allow / b[1].total - a[1].allow / a[1].total)
				.map(([kind, row]) => {
					const percent = (n: number) =>
						`${((n / row.total) * 100).toFixed(0)}%`;

					return `| ${kind} | ${row.total} | ${percent(row.lexicon)} | ${percent(row.ai)} | ${percent(row.flag)} | **${percent(row.allow)}** |`;
				});

			const falsePositives = okResults.filter(
				(entry) => entry.result.decision !== "allow",
			);
			// 通した（allow）もの。flag は、管理者が見るので、「止めた」とは数えないが、別に数える。
			const misses = ngResults.filter(
				(entry) => entry.result.decision === "allow",
			);
			const flagged = ngResults.filter(
				(entry) => entry.result.decision === "flag",
			);
			const unavailable = [...okResults, ...ngResults].filter(
				(entry) => entry.result.decision === "unavailable",
			);

			const lines = [
				`# 判定の評価（${new Date().toISOString()}）`,
				`元の語：${seeds.length}件（重複を除く前：${rawSeeds.length}件）／手元の例：${ngDirect.length}件（除く前：${rawDirect.length}件）`,
				`モデル：${process.env.MODERATION_EVAL_LEXICON_ONLY === "1" ? "（語の一覧だけ）" : process.env.MODERATION_EVAL_MODEL}`,
				"",
				...(duplicates.length === 0
					? []
					: [
							"## ⚠ 同じ文章が、複数の区分に入っています（どちらかから、外してください）",
							...duplicates.map(
								([key, groups]) => `- ${key}：${[...groups].join("・")}`,
							),
							"",
						]),
				`## よい文章：${okResults.length}件`,
				`- 通した（allow）：${count(okResults, "allow")}`,
				`- 誤って、止めた（block）：${count(okResults, "block")}`,
				`- 誤って、怪しいとした（flag）：${count(okResults, "flag")}`,
				"",
				`## 判断が分かれる文章：${borderlineResults.length}件`,
				`- 通した（allow）：${count(borderlineResults, "allow")}`,
				`- 怪しいとした（flag。管理者の画面に載る）：${count(borderlineResults, "flag")}`,
				`- 止めた（block）：${count(borderlineResults, "block")}`,
				"",
				`## 悪い文章：${ngResults.length}件`,
				`- 止めた（block）：${count(ngResults, "block")}`,
				`- 怪しいとした（flag）：${flagged.length}`,
				`- **通した（allow）：${misses.length}**`,
				"",
				`消費した Neurons：約${Math.round(usedNeurons)}（無料枠は、1日 10,000）`,
				`## 判定できなかった（unavailable）：${unavailable.length}件`,
				...[...judgeErrors.entries()]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 8)
					.map(([reason, times]) => `- ${times}回：${reason}`),
				"",
				"## 悪い文章：書き換えの種類ごと（通した率の高い順）",
				"| 種類 | 件数 | 一覧で止めた | AI が止めた | 怪しいとした | 通した |",
				"|---|---|---|---|---|---|",
				...kindTable,
				"",
				"## 誤って、止めた・怪しいとした、よい文章",
				...falsePositives.map(
					(entry) =>
						`- [${entry.result.decision}] ${entry.text.replace(/\n/gu, " ⏎ ")}`,
				),
				"",
				"## 止めた、判断が分かれる文章",
				...borderlineResults
					.filter((entry) => entry.result.decision === "block")
					.map((entry) => `- ${entry.text.replace(/\n/gu, " ⏎ ")}`),
				"",
				"## 通してしまった、悪い文章",
				...misses.map(
					(entry) => `- ${entry.label}：${entry.text.replace(/\n/gu, " ⏎ ")}`,
				),
				"",
				"## 怪しいとした（管理者の画面に載る）、悪い文章",
				...flagged.map(
					(entry) => `- ${entry.label}：${entry.text.replace(/\n/gu, " ⏎ ")}`,
				),
			];

			// 半分以上が判定できなかった実行（無料枠の上限など）は、前回の結果を消さないよう、別のファイルに書く。
			const isMostlyFailed =
				unavailable.length > (okResults.length + ngResults.length) / 2;

			writeFileSync(
				isMostlyFailed
					? "moderation-eval/report-failed.local"
					: "moderation-eval/report.local",
				`${lines.join("\n")}\n`,
			);
			console.log(lines.slice(0, 24).join("\n"));
			console.log(kindTable.join("\n"));
			console.log(
				isMostlyFailed
					? "判定できなかった件数が多いので、moderation-eval/report-failed.local に書きました（前回の report.local は、そのままです）"
					: "詳しくは moderation-eval/report.local を見てください",
			);

			// 実行そのものが成り立つことだけを確かめる（合否の基準は、結果を見て決める）。
			expect(okResults.length).toBeGreaterThan(0);
		},
		60 * 60 * 1000,
	);
});
