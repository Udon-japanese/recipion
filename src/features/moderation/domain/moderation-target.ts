// 判定する対象の種類。機能が増えたら、ここに足す（判定の仕組みは、この一覧を通して、対象を知る）。
// description は、AI の判定に渡す、その文章の説明（どんな文脈で、書かれたものか）。

export const moderationTargets = {
	"recipe-title": { description: "レシピのタイトル" },
	"recipe-ingredient": { description: "レシピの材料の名前・分量" },
	"recipe-preparation": { description: "レシピの下準備の文章" },
	"recipe-instruction": { description: "レシピの作り方の文章" },
	"recipe-note": { description: "レシピのメモ" },
	"recipe-link-label": {
		description: "レシピ内の、他のレシピへのリンクの名前",
	},
	"profile-display-name": {
		description: "利用者の表示名（他の利用者に見える名前）",
	},
	"profile-handle": {
		description: "利用者のハンドル（@で始まる、他の利用者に見える名前）",
	},
} as const;

export type ModerationTargetKind = keyof typeof moderationTargets;

// 判定する、1つの文章。
export type ModerationItem = {
	target: ModerationTargetKind;
	text: string;
};
