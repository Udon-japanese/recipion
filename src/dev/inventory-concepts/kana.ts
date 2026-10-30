import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";

const rows = [
	["あ", "あいうえお"],
	["か", "かきくけこがぎぐげご"],
	["さ", "さしすせそざじずぜぞ"],
	["た", "たちつてとだぢづでど"],
	["な", "なにぬねの"],
	["は", "はひふへほばびぶべぼぱぴぷぺぽ"],
	["ま", "まみむめも"],
	["や", "やゆよ"],
	["ら", "らりるれろ"],
	["わ", "わをん"],
] as const;

export const kanaRowLabels: readonly string[] = [
	...rows.map(([label]) => label),
	"他",
];

function toHiragana(text: string): string {
	return text.replace(/[ァ-ヶ]/g, (char) =>
		String.fromCharCode(char.charCodeAt(0) - 0x60),
	);
}

// 並べ替えと「あいうえお」の行に使う読み仮名（カタログにあれば、その読み。なければ名前のまま）。
export function readingOf(name: string): string {
	return toHiragana(findIngredientCatalogEntry(name)?.reading ?? name);
}

export function kanaRowOf(name: string): string {
	const first = readingOf(name).charAt(0);

	return rows.find(([, chars]) => chars.includes(first))?.[0] ?? "他";
}
