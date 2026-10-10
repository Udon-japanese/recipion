import type { LexiconEntry } from "./types";

// 手元だけのファイル（hard-block.local.ts・context-sensitive.local.ts）の、書き方の例。この例の語は、実在しない、架空の語。
// 実際のファイルは、このように、default でエントリーの配列を書き出す。
// - category: violence / sexual / discrimination / harassment / spam
// - terms: 言い換え・当て字・表記のゆれも、並べる（ひらがな・カタカナ・全角半角・大文字小文字・区切り・伏せ字は、照合のときに、そろえる）
const entries: readonly LexiconEntry[] = [
	{ category: "harassment", terms: ["ぴよぴよ野郎", "ぽんぽこ"] },
];

export default entries;
