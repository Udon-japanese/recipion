// 単語の一覧（レキシコン）の型。表記は、書いたままでよい（照合のとき、正規化する）。

export type LexiconCategory =
	// 暴力・脅し・死ね などの攻撃
	| "violence"
	// 性的な語
	| "sexual"
	// 差別・蔑称
	| "discrimination"
	// 侮辱・嫌がらせ
	| "harassment"
	// 連絡先・勧誘など（スパム・個人情報）
	| "spam";

export type LexiconEntry = {
	category: LexiconCategory;
	// 言い換え・伏せ字・当て字も、ここに並べる（例：「しね」「氏ね」「4ね」）。
	terms: readonly string[];
};
