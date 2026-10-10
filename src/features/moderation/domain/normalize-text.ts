// 文章の判定（モデレーション）の前処理。言い換え・伏せ字・記号の挿入などの、すり抜けを減らすために、表記をそろえる。

// 見えない文字（ゼロ幅の空白・方向の制御・異体字セレクタ・ソフトハイフンなど）のコードポイントの範囲。
const invisibleRanges: readonly (readonly [number, number])[] = [
	[0x00ad, 0x00ad],
	[0x034f, 0x034f],
	[0x061c, 0x061c],
	[0x115f, 0x1160],
	[0x17b4, 0x17b5],
	[0x180b, 0x180f],
	[0x200b, 0x200f],
	[0x202a, 0x202e],
	[0x2060, 0x206f],
	[0x3164, 0x3164],
	[0xfe00, 0xfe0f],
	[0xfeff, 0xfeff],
	[0xe0100, 0xe01ef],
];

function isInvisible(char: string): boolean {
	const codePoint = char.codePointAt(0) ?? 0;

	return invisibleRanges.some(
		([from, to]) => codePoint >= from && codePoint <= to,
	);
}

function removeInvisible(text: string): string {
	return [...text].filter((char) => !isInvisible(char)).join("");
}

// 伏せ字に使われやすい記号（NFKC のあと）。1文字を、何かの文字の代わりとして扱う。
export const maskCharacters = "○◯●◎◇◆□■△▲▽▼☆★×✕＊*＿_?？…";

const maskPattern = new RegExp(
	`[${maskCharacters.replace(/[\]\\^-]/gu, "\\$&")}]`,
	"u",
);

export function isMaskCharacter(char: string): boolean {
	return maskPattern.test(char);
}

// カタカナを、ひらがなにそろえる（ー は、そのまま）。
function foldKatakana(text: string): string {
	return text.replace(/[ァ-ヶ]/gu, (char) =>
		String.fromCharCode(char.charCodeAt(0) - 0x60),
	);
}

// 文字の間に挟まれて、単語を分断するための、区切りの文字（空白・句読点・中黒・点・ハイフンなど）。
// 伏せ字の記号や、絵文字は、ここに含めない。
const separatorPattern = /[\s\p{Z}\p{P}\p{Cc}]/u;

export type NormalizedText = {
	// NFKC・見えない文字の除去・小文字・カタカナ→ひらがな。区切りは残す。
	text: string;
	// text から、区切りの文字を除いたもの（「ば.か」「ば か」を、「ばか」にする）。
	compact: string;
	// 含まれる絵文字（記号）だけを、順に並べたもの。
	emoji: string;
};

export function normalizeForModeration(input: string): NormalizedText {
	const text = foldKatakana(
		removeInvisible(input.normalize("NFKC")).toLocaleLowerCase("ja-JP"),
	);

	// 伏せ字の記号は、記号（P・S）に当たるものがあるので、区切りとは別に扱う。
	const compact = [...text]
		.filter((char) => isMaskCharacter(char) || !separatorPattern.test(char))
		.join("");

	const emoji = (text.match(/\p{Extended_Pictographic}/gu) ?? []).join("");

	return { text, compact, emoji };
}
