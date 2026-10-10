import type { ModerationTargetKind } from "./moderation-target";

export type ModerationCategory =
	| "violence"
	| "sexual"
	| "discrimination"
	| "harassment"
	| "spam"
	| "personal-info"
	| "irrelevant"
	| "other";

export const moderationCategoryLabels: Record<ModerationCategory, string> = {
	violence: "暴力・脅し",
	sexual: "性的な内容",
	discrimination: "差別・蔑称",
	harassment: "侮辱・嫌がらせ",
	spam: "勧誘・広告",
	"personal-info": "個人情報",
	irrelevant: "レシピと関係のない内容",
	other: "不適切な内容",
};

export type ModerationReason = {
	target: ModerationTargetKind;
	// 判定の手段（lexicon: 確定の語、emoji: 絵文字の組み合わせ、ai: AI）。
	source: "lexicon" | "emoji" | "ai";
	category: ModerationCategory;
};

export type ModerationResult =
	// 問題なし。
	| { decision: "allow" }
	// 怪しい。公開は通し、管理者の画面に、自動検知として載せる。
	| { decision: "flag"; reasons: ModerationReason[] }
	// 公開できない。
	| { decision: "block"; reasons: ModerationReason[] }
	// AI が使えなかった（上限・障害）。公開は止める。
	| { decision: "unavailable" };
