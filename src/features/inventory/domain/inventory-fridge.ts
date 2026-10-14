import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import type { InventoryListItem } from "../application/inventory-query-repository";
import {
	daysBetween,
	type InventoryExpiryKind,
	type InventoryLot,
	type InventoryStorage,
	sumLotQuantities,
} from "./inventory-lot";

// 在庫の画面（冷蔵庫）の組み立て。画面に依存しない純粋な計算だけを置く。

export type InventoryZoneId =
	| "fridge"
	| "door"
	| "vegetable"
	| "freezer"
	| "table";

// 上から並べる順。机の上だけは、冷蔵庫（庫内）の外。
export const inventoryZones = [
	{ id: "fridge", label: "冷蔵室", inside: true },
	{ id: "door", label: "ドア", inside: true },
	{ id: "vegetable", label: "野菜室", inside: true },
	{ id: "freezer", label: "冷凍室", inside: true },
	{ id: "table", label: "机の上", inside: false },
] as const satisfies readonly {
	id: InventoryZoneId;
	label: string;
	inside: boolean;
}[];

export const inventoryZoneLabels: Record<InventoryZoneId, string> =
	Object.fromEntries(
		inventoryZones.map((zone) => [zone.id, zone.label]),
	) as Record<InventoryZoneId, string>;

// 期限の近さ。expired：切れ／soon：今日・明日／near：2〜3日後／none：何も出さない。
export type InventoryExpiryLevel = "expired" | "soon" | "near" | "none";

export type InventoryTileExpiry = {
	expiresOn: string;
	// 今日からの日数（切れは負）。
	daysLeft: number;
	level: Exclude<InventoryExpiryLevel, "none">;
	kind: InventoryExpiryKind | null;
	// 自動の目安（「約」）。
	approximate: boolean;
	// 「切れ」「今日」「明日」「3日」。
	badgeText: string;
};

// 粒（卵のかたち）で表す量。1個＝1粒。端数は、最後の粒の一部だけを塗る。
export type InventoryTileGrains = {
	full: number;
	// 0 より大きく 1 より小さい。最後の粒の塗る割合。なければ 0。
	partial: number;
};

export type InventoryTile = {
	// ゾーンごとに一意（ゾーンをまたぐ食材は、タイルが分かれる）。
	key: string;
	inventoryItemId: string;
	zone: InventoryZoneId;
	name: string;
	// このゾーンにある（数量が 0 より多い）ロットの数。
	lotCount: number;
	// このゾーンのロットの数量の合計。
	quantity: number;
	trackingMode: InventoryListItem["trackingMode"];
	stockUnitCode: InventoryListItem["stockUnitCode"];
	stockUnitLabel: string;
	// 有無だけの食材の「あり」。
	isPresent: boolean;
	// 数量が 0（有無だけ以外）。
	isEmpty: boolean;
	expiry: InventoryTileExpiry | null;
	// 粒で表すとき。
	grains: InventoryTileGrains | null;
	// 水位（0〜1）。満タンの量が分かる、量を追う食材だけ（g・ml と、11個以上の個数）。
	level: number | null;
	// 「だいたいで管理」（波線・破線で表す）。
	approximate: boolean;
	// 並べ替えの鍵：数量が 0 より多いロットのいちばん近い期限（なければ null）と、読み仮名。
	sortExpiresOn: string | null;
	sortReading: string;
};

export type InventoryFridgeZone = {
	id: InventoryZoneId;
	label: string;
	inside: boolean;
	tiles: InventoryTile[];
};

export type InventoryCatalogLookup = (name: string) => {
	defaultStorage: InventoryStorage | null;
	isProduce: boolean;
	reading: string | null;
} | null;

export const defaultCatalogLookup: InventoryCatalogLookup = (name) => {
	const entry = findIngredientCatalogEntry(name);

	if (!entry) {
		return null;
	}

	return {
		defaultStorage: entry.expiry?.defaultStorage ?? null,
		isProduce: entry.categoryId === "produce",
		reading: entry.reading ?? null,
	};
};

type ZoneInput = {
	trackingMode: InventoryListItem["trackingMode"];
	// ロットの保存方法 → ユーザーが決めた初期値 → カタログの初期値、の順で決めたもの。
	storage: InventoryStorage | null;
	isProduce: boolean;
};

/**
 * 食材（のロット）が入るゾーン。
 * 有無だけ→ドア／冷凍→冷凍室／常温→机の上／冷蔵で野菜・果物→野菜室／それ以外（不明も）→冷蔵室。
 */
export function assignInventoryZone(input: ZoneInput): InventoryZoneId {
	if (input.trackingMode === "presence") {
		return "door";
	}

	if (input.storage === "freezer") {
		return "freezer";
	}

	if (input.storage === "room") {
		return "table";
	}

	if (input.storage === "fridge" && input.isProduce) {
		return "vegetable";
	}

	return "fridge";
}

/**
 * ロットのゾーン。ロットの保存方法がなければ、食材の初期の保存方法（ユーザーが決めたもの→カタログ）。
 */
export function getLotZone(
	item: Pick<InventoryListItem, "name" | "trackingMode" | "defaultStorage">,
	lot: Pick<InventoryLot, "storage">,
	lookup: InventoryCatalogLookup = defaultCatalogLookup,
): InventoryZoneId {
	const catalog = lookup(item.name);

	return assignInventoryZone({
		trackingMode: item.trackingMode,
		storage:
			lot.storage ?? item.defaultStorage ?? catalog?.defaultStorage ?? null,
		isProduce: catalog?.isProduce ?? false,
	});
}

const grainLimit = 10;

export function toGrains(quantity: number): InventoryTileGrains | null {
	if (quantity <= 0 || quantity > grainLimit) {
		return null;
	}

	const full = Math.floor(quantity + 1e-9);
	const partial = Number((quantity - full).toFixed(4));

	return { full, partial: partial > 0.0001 ? partial : 0 };
}

const minWaterLevel = 0.06;

// 水位＝いまの量 ÷ 満タンの量。0 より多いのに空に見えないよう、最小 6%、最大 100%。0 のときは水位なし。
// 個数は、粒で表せる（10個まで）ときは水位にしない。
export function toWaterLevel(
	quantity: number,
	capacity: number | undefined,
	stockUnitCode: InventoryListItem["stockUnitCode"],
): number | null {
	if (quantity <= 0 || capacity === undefined || !(capacity > 0)) {
		return null;
	}

	if (stockUnitCode === "count" && quantity <= grainLimit) {
		return null;
	}

	return Math.min(1, Math.max(minWaterLevel, quantity / capacity));
}

function expiryBadgeText(daysLeft: number): string {
	if (daysLeft < 0) {
		return "切れ";
	}

	if (daysLeft === 0) {
		return "今日";
	}

	if (daysLeft === 1) {
		return "明日";
	}

	return `${daysLeft}日`;
}

/**
 * 期限の近さ。今日を基準に、昨日以前＝切れ、今日・明日＝soon、2〜3日後＝near、それより先＝なし。
 */
export function getExpiryLevel(
	daysLeft: number,
): "expired" | "soon" | "near" | "none" {
	if (daysLeft < 0) {
		return "expired";
	}

	if (daysLeft <= 1) {
		return "soon";
	}

	return daysLeft <= 3 ? "near" : "none";
}

// 量が 0 より多いロットのうち、いちばん近い期限。
export function findNearestExpiry(
	lots: readonly InventoryLot[],
	today: string,
): InventoryTileExpiry | null {
	let nearest: InventoryLot | null = null;

	for (const lot of lots) {
		if (lot.quantity <= 0 || lot.expiresOn === null) {
			continue;
		}

		if (nearest === null || (nearest.expiresOn ?? "") > lot.expiresOn) {
			nearest = lot;
		}
	}

	if (nearest === null || nearest.expiresOn === null) {
		return null;
	}

	const daysLeft = daysBetween(today, nearest.expiresOn);
	const level = getExpiryLevel(daysLeft);

	if (level === "none") {
		return null;
	}

	return {
		expiresOn: nearest.expiresOn,
		daysLeft,
		level,
		kind: nearest.expiryKind,
		approximate: nearest.expirySource === "estimated",
		badgeText: expiryBadgeText(daysLeft),
	};
}

// 期限の近い順（期限なしは最後）、同じなら読み仮名の順。有無だけ（ドア）は、読み仮名の順のまま。
export function compareTiles(a: InventoryTile, b: InventoryTile): number {
	if (a.zone !== "door" && a.sortExpiresOn !== b.sortExpiresOn) {
		if (a.sortExpiresOn === null) {
			return 1;
		}

		if (b.sortExpiresOn === null) {
			return -1;
		}

		return a.sortExpiresOn < b.sortExpiresOn ? -1 : 1;
	}

	return a.sortReading.localeCompare(b.sortReading, "ja");
}

// 並び順に使う「いちばん近い期限」は、近さの段階にかかわらず、日付で比べる。
function nearestExpiryDate(lots: readonly InventoryLot[]): string | null {
	const dates = lots.flatMap((lot) =>
		lot.quantity > 0 && lot.expiresOn !== null ? [lot.expiresOn] : [],
	);

	return dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

/**
 * 在庫の食材を、ゾーンごとのタイルにする。
 * - 食材は、ロットの行き先のゾーンごとにタイルになる（牛乳が冷蔵と冷凍にあれば、2枚）。
 * - ロットが一つもない食材（数量 0）は、食材の保存方法の初期値で決まるゾーンに、空のタイルで出す。
 */
export function buildInventoryFridge(
	items: readonly InventoryListItem[],
	today: string,
	lookup: InventoryCatalogLookup = defaultCatalogLookup,
	// 食材ごとの「満タンの量」（食材の在庫の単位で、食材全体の量。ゾーンをまたぐときは、ゾーンの割合で数える）。
	capacities: ReadonlyMap<string, number> = new Map(),
): InventoryFridgeZone[] {
	const tilesByZone = new Map<InventoryZoneId, InventoryTile[]>(
		inventoryZones.map((zone) => [zone.id, []]),
	);

	for (const item of items) {
		const catalog = lookup(item.name);
		const isProduce = catalog?.isProduce ?? false;
		const fallbackStorage =
			item.defaultStorage ?? catalog?.defaultStorage ?? null;
		const name = item.displayName ?? item.name;
		const sortReading = item.displayName
			? item.displayName
			: (catalog?.reading ?? item.name);

		const stockedLots = item.lots.filter((lot) => lot.quantity > 0);
		const lotsByZone = new Map<InventoryZoneId, InventoryLot[]>();

		for (const lot of stockedLots) {
			const zone = assignInventoryZone({
				trackingMode: item.trackingMode,
				storage: lot.storage ?? fallbackStorage,
				isProduce,
			});

			lotsByZone.set(zone, [...(lotsByZone.get(zone) ?? []), lot]);
		}

		if (lotsByZone.size === 0) {
			lotsByZone.set(
				assignInventoryZone({
					trackingMode: item.trackingMode,
					storage: fallbackStorage,
					isProduce,
				}),
				[],
			);
		}

		for (const [zone, lots] of lotsByZone) {
			const quantity = sumLotQuantities(lots);
			const isPresence = item.trackingMode === "presence";

			tilesByZone.get(zone)?.push({
				key: `${item.inventoryItemId}:${zone}`,
				inventoryItemId: item.inventoryItemId,
				zone,
				name,
				lotCount: lots.length,
				quantity,
				trackingMode: item.trackingMode,
				stockUnitCode: item.stockUnitCode,
				stockUnitLabel: item.stockUnitLabel,
				isPresent: isPresence && quantity > 0,
				isEmpty: !isPresence && quantity <= 0,
				expiry: findNearestExpiry(lots, today),
				grains:
					!isPresence && item.stockUnitCode === "count"
						? toGrains(quantity)
						: null,
				level: isPresence
					? null
					: toWaterLevel(
							quantity,
							capacities.get(item.inventoryItemId),
							item.stockUnitCode,
						),
				approximate: item.trackingMode === "estimated",
				sortExpiresOn: nearestExpiryDate(lots),
				sortReading,
			});
		}
	}

	return inventoryZones.map((zone) => ({
		id: zone.id,
		label: zone.label,
		inside: zone.inside,
		tiles: (tilesByZone.get(zone.id) ?? []).sort(compareTiles),
	}));
}
