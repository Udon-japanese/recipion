import { findEmojiHits, findLexiconHits } from "../domain/find-lexicon-hits";
import {
	contextHintEmoji,
	contextSensitiveLexicon,
	innocentCookingPhrases,
} from "../domain/lexicon/context-sensitive";
import {
	type EmojiCombination,
	hardBlockEmoji,
	hardBlockLexicon,
} from "../domain/lexicon/hard-block";
import type { LexiconCategory, LexiconEntry } from "../domain/lexicon/types";
import {
	listJudgedItems,
	locateInText,
	type ModerationLocation,
} from "../domain/moderation-location";
import type {
	ModerationCategory,
	ModerationReason,
	ModerationResult,
} from "../domain/moderation-result";
import {
	type ModerationItem,
	moderationTargets,
} from "../domain/moderation-target";
import { normalizeForModeration } from "../domain/normalize-text";
import type { AiJudge, JudgeItem } from "./ai-judge";

// AI に渡す、1つの文章の長さの上限。これを超える文章は、分けて渡す（後ろに隠された内容も、見落とさないため）。
const maxJudgeChunkLength = 3000;

function toCategory(category: LexiconCategory): ModerationCategory {
	return category;
}

// AI が抜き出した部分の場所。原文にそのままないとき（書き換えた・作った）は、文章の場所だけにする。
function locateQuote(
	itemIndex: number,
	text: string,
	quote: string | undefined,
): ModerationLocation {
	const start = quote === undefined ? -1 : text.indexOf(quote);

	return start < 0 || quote === undefined
		? { item: itemIndex }
		: { item: itemIndex, start, end: start + quote.length };
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
// 判定に使う語の一覧。ふだんは、手元の一覧（hard-block.local.ts など）を取り込んだもの。テストでは、架空の語を渡す。
export type ModerationLexicons = {
	hard: readonly LexiconEntry[];
	// 絵文字の組み合わせ（すべて含まれていれば、確定で止める）。
	hardEmoji: readonly EmojiCombination[];
	context: readonly LexiconEntry[];
	// 単独でも、意味を持ちうる絵文字（注意する語として、AI に渡す）。
	hintEmoji: readonly string[];
	innocentPhrases: readonly string[];
};

const defaultLexicons: ModerationLexicons = {
	hard: hardBlockLexicon,
	hardEmoji: hardBlockEmoji,
	context: contextSensitiveLexicon,
	hintEmoji: contextHintEmoji,
	innocentPhrases: innocentCookingPhrases,
};

export async function moderateContent(
	items: readonly ModerationItem[],
	judge: AiJudge,
	lexicons: ModerationLexicons = defaultLexicons,
): Promise<ModerationResult> {
	const judgeItems: (JudgeItem & {
		source: ModerationItem;
		itemIndex: number;
		hintCategory: ModerationCategory | undefined;
	})[] = [];
	const blockReasons: ModerationReason[] = [];

	for (const [itemIndex, item] of listJudgedItems(items).entries()) {
		const normalized = normalizeForModeration(item.text);
		const hardHits = [
			...findLexiconHits(normalized, lexicons.hard, {
				allowMask: true,
				hiraganaBoundary: true,
			}),
			...findEmojiHits(normalized, lexicons.hardEmoji),
		];

		for (const hit of hardHits) {
			const isEmoji = /\p{Extended_Pictographic}/u.test(hit.term);

			blockReasons.push({
				target: item.target,
				source: isEmoji ? "emoji" : "lexicon",
				category: toCategory(hit.category),
				location: {
					item: itemIndex,
					...locateInText(item.text, (part) =>
						isEmoji
							? findEmojiHits(
									normalizeForModeration(part),
									lexicons.hardEmoji.filter(
										(combination) => combination.emoji.join("") === hit.term,
									),
								).length > 0
							: findLexiconHits(
									normalizeForModeration(part),
									[{ category: hit.category, terms: [hit.term] }],
									{ allowMask: true, hiraganaBoundary: true },
								).length > 0,
					),
				},
			});
		}

		const contextHits = findLexiconHits(normalized, lexicons.context, {
			innocentPhrases: lexicons.innocentPhrases,
		});
		const hintEmoji = lexicons.hintEmoji.filter((emoji) =>
			normalized.text.includes(emoji),
		);
		const hints = [...contextHits.map((hit) => hit.term), ...hintEmoji];
		// 注意する語に当たった文章は、AI が ok としても、flag にする（公開は通し、管理者の画面に載せる）。
		const hintCategory: ModerationCategory | undefined = contextHits[0]
			? toCategory(contextHits[0].category)
			: hintEmoji.length > 0
				? "other"
				: undefined;

		for (const chunk of splitLongText(item.text)) {
			judgeItems.push({
				target: item.target,
				text: chunk,
				normalizedText: normalizeForModeration(chunk).text,
				hints,
				source: item,
				itemIndex,
				hintCategory,
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
			judgeItems.map(
				({
					source: _source,
					itemIndex: _itemIndex,
					hintCategory: _category,
					...item
				}) => item,
			),
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

		if (!item) {
			continue;
		}

		// 名前の欄では、レシピとの関係（irrelevant）を問わない（プロンプトでも伝えるが、AI が守らなくても、通す）。
		const ignoresVerdict =
			verdict.category === "irrelevant" &&
			!moderationTargets[item.target].judgesRelevance;

		if (verdict.verdict === "ok" || ignoresVerdict) {
			if (item.hintCategory) {
				flagged.push({
					target: item.target,
					source: "lexicon",
					category: item.hintCategory,
					location: { item: item.itemIndex },
				});
			}

			continue;
		}

		const reason: ModerationReason = {
			target: item.target,
			source: "ai",
			category: verdict.category,
			location: locateQuote(item.itemIndex, item.source.text, verdict.quote),
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
