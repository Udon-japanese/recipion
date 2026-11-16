import {
	compareTiles,
	type InventoryTile,
	inventoryZones,
} from "./inventory-fridge";
import { daysBetween, toDateString } from "./inventory-lot";

// 在庫の一覧の「まとめ方」：場所・期限・入れた日・あいうえお。
export type InventoryGroupBy = "zone" | "expiry" | "added" | "kana";

export type InventoryGroup = { id: string; label: string };

export const inventoryGroupByOptions: readonly {
	value: InventoryGroupBy;
	label: string;
}[] = [
	{ value: "zone", label: "場所" },
	{ value: "expiry", label: "期限" },
	{ value: "added", label: "入れた日" },
	{ value: "kana", label: "あいうえお" },
];

const expiryGroups: readonly InventoryGroup[] = [
	{ id: "expired", label: "切れている" },
	{ id: "soon", label: "3日以内" },
	{ id: "week", label: "2週間以内" },
	{ id: "later", label: "それより先" },
	{ id: "none", label: "期限なし" },
];

const addedGroups: readonly InventoryGroup[] = [
	{ id: "today", label: "今日" },
	{ id: "yesterday", label: "昨日" },
	{ id: "week", label: "1週間以内" },
	{ id: "earlier", label: "それより前" },
	{ id: "none", label: "在庫なし" },
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

// 入れた日（日本時間の日付）で分ける。量のあるロットがなければ「在庫なし」。
function addedGroupOf(tile: InventoryTile, today: string): string {
	if (tile.sortAddedAt === null) {
		return "none";
	}

	const days = daysBetween(toDateString(new Date(tile.sortAddedAt)), today);

	// 端末の時計がずれて「未来」に入れたことになっても、今日に入れる。
	if (days <= 0) {
		return "today";
	}

	if (days === 1) {
		return "yesterday";
	}

	return days <= 7 ? "week" : "earlier";
}

// まとめ方ごとの、グループの並び（一覧の縦タブ・チップの並び）。
export function listInventoryGroups(by: InventoryGroupBy): InventoryGroup[] {
	switch (by) {
		case "zone":
			return inventoryZones.map(({ id, label }) => ({ id, label }));
		case "expiry":
			return [...expiryGroups];
		case "added":
			return [...addedGroups];
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
		case "added":
			return addedGroupOf(tile, today);
		case "kana":
			return kanaRowOf(tile.sortReading);
	}
}

function compareReading(a: InventoryTile, b: InventoryTile): number {
	return toHiragana(a.sortReading).localeCompare(
		toHiragana(b.sortReading),
		"ja",
	);
}

// 新しく入れた順（入れた日時のないものは最後）、同じなら読み仮名の順。
function compareAdded(a: InventoryTile, b: InventoryTile): number {
	if (a.sortAddedAt !== b.sortAddedAt) {
		if (a.sortAddedAt === null) {
			return 1;
		}

		if (b.sortAddedAt === null) {
			return -1;
		}

		return a.sortAddedAt > b.sortAddedAt ? -1 : 1;
	}

	return compareReading(a, b);
}

// 並び：あいうえおは読み仮名の順。入れた日は、新しく入れた順。それ以外は、期限の近い順（同じなら読み仮名の順）。
export function compareTilesFor(
	by: InventoryGroupBy,
): (a: InventoryTile, b: InventoryTile) => number {
	switch (by) {
		case "kana":
			return compareReading;
		case "added":
			return compareAdded;
		default:
			return compareTiles;
	}
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
