// 審査する対象（利用者が書く、他の人に見える文章）の登録簿。
//
// 【ユーザーが入力する欄を足すときの手順】
// 1. 他の人に見える文章なら、ここに1行足す（description・label・onFlag）。
// 2. その欄を保存する、サーバー関数の中で、保存の前に enforceModeration（moderation/server/enforce-moderation.ts）を呼ぶ。
//    項目は { target, text } の配列。値が変わった欄だけを渡す（変わらない欄で、AI の枠を使わない）。
// 3. 長さの上限も、その機能の limits（例：recipes/domain/recipe-limits.ts）に足す。
// 型が、足し忘れを教える：publish-refusal-message などは、この登録簿のすべての項目を使う。
//
// description：AI に渡す、その文章の説明（どんな文脈で、書かれたものか）。
// label：利用者に見せる、欄の名前。
// onFlag：「怪しい」と判定されたときの扱い。
//   allow：公開は通し、管理者の画面に、自動検知として載せる（レシピなど、載せる先がある文章）。
//   reject：その場で断る（表示名のように、短く、目立ち、載せる先がない文章）。違反の回数には、数えない。

export type FlagPolicy = "allow" | "reject";

export const moderationTargets = {
	"recipe-title": {
		description: "レシピのタイトル",
		label: "タイトル",
		onFlag: "allow",
	},
	"recipe-ingredient": {
		description: "レシピの材料の名前・分量",
		label: "材料",
		onFlag: "allow",
	},
	"recipe-preparation": {
		description: "レシピの下準備の文章",
		label: "下準備",
		onFlag: "allow",
	},
	"recipe-instruction": {
		description: "レシピの作り方の文章",
		label: "作り方",
		onFlag: "allow",
	},
	"recipe-note": {
		description: "レシピのメモ",
		label: "メモ",
		onFlag: "allow",
	},
	"recipe-link-label": {
		description: "レシピ内の、他のレシピへのリンクの名前",
		label: "リンクの名前",
		onFlag: "allow",
	},
	"profile-display-name": {
		description: "利用者の表示名（他の利用者に見える名前）",
		label: "表示名",
		onFlag: "reject",
	},
	"profile-handle": {
		description: "利用者のハンドル（@で始まる、他の利用者に見える名前）",
		label: "ハンドル",
		onFlag: "reject",
	},
} as const satisfies Record<
	string,
	{ description: string; label: string; onFlag: FlagPolicy }
>;

export type ModerationTargetKind = keyof typeof moderationTargets;

// 判定する、1つの文章。
export type ModerationItem = {
	target: ModerationTargetKind;
	text: string;
};
