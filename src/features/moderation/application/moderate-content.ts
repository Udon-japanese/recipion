import { findEmojiHits, findLexiconHits } from "../domain/find-lexicon-hits";
import {
	contextSensitiveLexicon,
	innocentCookingPhrases,
} from "../domain/lexicon/context-sensitive";
import { hardBlockEmoji, hardBlockLexicon } from "../domain/lexicon/hard-block";
import type { LexiconCategory } from "../domain/lexicon/types";
import type {
	ModerationCategory,
	ModerationReason,
	ModerationResult,
} from "../domain/moderation-result";
import type { ModerationItem } from "../domain/moderation-target";
import { normalizeForModeration } from "../domain/normalize-text";
import type { AiJudge, JudgeItem } from "./ai-judge";

// AI に渡す、1つの文章の長さの上限。これを超える文章は、分けて渡す（後ろに隠された内容も、見落とさないため）。
const maxJudgeChunkLength = 3000;

function toCategory(category: LexiconCategory): ModerationCategory {
	return category;
}

function splitLongText(text: string): string[] {
	if (text.length <= maxJudgeChunkLength) {
		return [text];
	}

	const chunks: string[] = [];
	let current = "";

	for (const line of text.split("\n")) {
		if (
			current !== "" &&
			current.length + line.length + 1 > maxJudgeChunkLength
		) {
			chunks.push(current);
			current = "";
		}

		// 1行が、上限を超えるときは、文字数で分ける。
		for (let start = 0; start < line.length; start += maxJudgeChunkLength) {
			const piece = line.slice(start, start + maxJudgeChunkLength);

			current = current === "" ? piece : `${current}\n${piece}`;

			if (current.length >= maxJudgeChunkLength) {
				chunks.push(current);
				current = "";
			}
		}
	}

	if (current !== "") {
		chunks.push(current);
	}

	return chunks;
}

/**
 * 公開しようとする文章を、審査する。
 * 1. 確定で弾く語・絵文字の組み合わせ（hard-block）が、1つでもあれば、AI に聞かずに block。
 * 2. それ以外は、すべて AI に判定させる（文脈で意味が変わる語は、注意する語として渡す）。
 * 3. AI が ng なら block、unsure なら flag（公開は通し、管理者に知らせる）、使えなければ unavailable。
 */
export async function moderateContent(
	items: readonly ModerationItem[],
	judge: AiJudge,
): Promise<ModerationResult> {
	const judgeItems: (JudgeItem & { source: ModerationItem })[] = [];
	const blockReasons: ModerationReason[] = [];

	for (const item of items) {
		if (item.text.trim() === "") {
			continue;
		}

		const normalized = normalizeForModeration(item.text);
		const hardHits = [
			...findLexiconHits(normalized, hardBlockLexicon, {
				allowMask: true,
				hiraganaBoundary: true,
			}),
			...findEmojiHits(normalized, hardBlockEmoji),
		];

		for (const hit of hardHits) {
			blockReasons.push({
				target: item.target,
				source: hit.term.match(/\p{Extended_Pictographic}/u)
					? "emoji"
					: "lexicon",
				category: toCategory(hit.category),
			});
		}

		const hints = findLexiconHits(normalized, contextSensitiveLexicon, {
			innocentPhrases: innocentCookingPhrases,
		}).map((hit) => hit.term);

		for (const chunk of splitLongText(item.text)) {
			judgeItems.push({
				target: item.target,
				text: chunk,
				normalizedText: normalizeForModeration(chunk).text,
				hints,
				source: item,
			});
		}
	}

	if (blockReasons.length > 0) {
		return { decision: "block", reasons: blockReasons };
	}

	if (judgeItems.length === 0) {
		return { decision: "allow" };
	}

	let verdicts: Awaited<ReturnType<AiJudge>>;

	try {
		verdicts = await judge(
			judgeItems.map(({ source: _source, ...item }) => item),
		);

		if (verdicts.length !== judgeItems.length) {
			return { decision: "unavailable" };
		}
	} catch {
		return { decision: "unavailable" };
	}

	const blocked: ModerationReason[] = [];
	const flagged: ModerationReason[] = [];

	for (const [index, verdict] of verdicts.entries()) {
		const item = judgeItems[index];

		if (!item || verdict.verdict === "ok") {
			continue;
		}

		const reason: ModerationReason = {
			target: item.target,
			source: "ai",
			category: verdict.category,
		};

		(verdict.verdict === "ng" ? blocked : flagged).push(reason);
	}

	if (blocked.length > 0) {
		return { decision: "block", reasons: blocked };
	}

	return flagged.length > 0
		? { decision: "flag", reasons: flagged }
		: { decision: "allow" };
}
