import {
	compareTiles,
	type InventoryTile,
	inventoryZones,
} from "./inventory-fridge";
import { daysBetween } from "./inventory-lot";

// 在庫の一覧の「まとめ方」：場所・期限・あいうえお。
export type InventoryGroupBy = "zone" | "expiry" | "kana";

export type InventoryGroup = { id: string; label: string };

export const inventoryGroupByOptions: readonly {
	value: InventoryGroupBy;
	label: string;
}[] = [
	{ value: "zone", label: "場所" },
	{ value: "expiry", label: "期限" },
	{ value: "kana", label: "あいうえお" },
];

const expiryGroups: readonly InventoryGroup[] = [
	{ id: "expired", label: "切れている" },
	{ id: "soon", label: "3日以内" },
	{ id: "week", label: "2週間以内" },
	{ id: "later", label: "それより先" },
	{ id: "none", label: "期限なし" },
];

const kanaRows = [
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

const otherKana = "他";

export function toHiragana(text: string): string {
	return text.replace(/[ァ-ヶ]/g, (char) =>
		String.fromCharCode(char.charCodeAt(0) - 0x60),
	);
}

function kanaRowOf(reading: string): string {
	const first = toHiragana(reading).charAt(0);

	return kanaRows.find(([, chars]) => chars.includes(first))?.[0] ?? otherKana;
}

function expiryGroupOf(tile: InventoryTile, today: string): string {
	if (tile.sortExpiresOn === null) {
		return "none";
	}

	const days = daysBetween(today, tile.sortExpiresOn);

	if (days < 0) {
		return "expired";
	}

	if (days <= 3) {
		return "soon";
	}

	return days <= 14 ? "week" : "later";
}

// まとめ方ごとの、グループの並び（一覧の縦タブ・チップの並び）。
export function listInventoryGroups(by: InventoryGroupBy): InventoryGroup[] {
	switch (by) {
		case "zone":
			return inventoryZones.map(({ id, label }) => ({ id, label }));
		case "expiry":
			return [...expiryGroups];
		case "kana":
			return [...kanaRows.map(([label]) => label), otherKana].map((label) => ({
				id: label,
				label,
			}));
	}
}

// タイルが入るグループの ID。
export function inventoryGroupOf(
	tile: InventoryTile,
	by: InventoryGroupBy,
	today: string,
): string {
	switch (by) {
		case "zone":
			return tile.zone;
		case "expiry":
			return expiryGroupOf(tile, today);
		case "kana":
			return kanaRowOf(tile.sortReading);
	}
}

// 並び：あいうえおは読み仮名の順。それ以外は、期限の近い順（同じなら読み仮名の順）。
export function compareTilesFor(
	by: InventoryGroupBy,
): (a: InventoryTile, b: InventoryTile) => number {
	return by === "kana"
		? (a, b) =>
				toHiragana(a.sortReading).localeCompare(toHiragana(b.sortReading), "ja")
		: compareTiles;
}

// 「早めに使う」：期限が近い・切れた食材を、近い順に（場所が分かれた食材は、1つにまとめる）。
export function pickUseSoonTiles(
	tiles: readonly InventoryTile[],
	limit = 3,
): InventoryTile[] {
	const seen = new Set<string>();

	return tiles
		.filter((tile) => tile.expiry !== null)
		.sort((a, b) => (a.expiry?.daysLeft ?? 0) - (b.expiry?.daysLeft ?? 0))
		.filter((tile) => {
			if (seen.has(tile.inventoryItemId)) {
				return false;
			}

			seen.add(tile.inventoryItemId);

			return true;
		})
		.slice(0, limit);
}
