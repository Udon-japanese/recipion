import type { InventoryTrackingMode } from "./apply-inventory-adjustment";

// 在庫は、買った（追加した）単位ごとの「ロット」で持つ。食材の数量は、ロットの数量の合計。
// 期限（消費期限・賞味期限）は、ロットごとに持つ。期限は任意で、なくてもロットとして成立する。

export type InventoryStorage = "room" | "fridge" | "freezer";

export type InventoryExpiryKind = "use-by" | "best-before" | "none";

// entered: ユーザーが入力した日付。estimated: 買った日と日数から出した目安（「約」と表示する）。
export type InventoryExpirySource = "entered" | "estimated";

export type InventoryLot = {
	id: string;
	quantity: number;
	// 買った（追加した）日。YYYY-MM-DD。
	acquiredOn: string;
	storage: InventoryStorage | null;
	// 期限の日付。YYYY-MM-DD。
	expiresOn: string | null;
	expiryKind: InventoryExpiryKind | null;
	expirySource: InventoryExpirySource | null;
	createdAt: string;
};

export type InventoryLotConditions = Pick<
	InventoryLot,
	"acquiredOn" | "storage" | "expiresOn" | "expiryKind" | "expirySource"
>;

// 追加するときの、ロットの条件の入力（すべて任意）。省略した項目は、既定値になる。
export type InventoryLotInput = {
	acquiredOn?: string;
	storage?: InventoryStorage | null;
	expiresOn?: string | null;
	expiryKind?: InventoryExpiryKind | null;
	expirySource?: InventoryExpirySource | null;
};

export type InventoryLotAllocation = {
	lotId: string;
	// 在庫の単位での数量。
	quantity: number;
};

// 日付（YYYY-MM-DD）は、日本時間で数える。
export function toDateString(date: Date): string {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function roundQuantity(value: number): number {
	return Number(value.toFixed(6));
}

export function sumLotQuantities(
	lots: readonly { quantity: number }[],
): number {
	return roundQuantity(lots.reduce((sum, lot) => sum + lot.quantity, 0));
}

// 減らす順：期限の早いものから。期限がないものは、期限があるものの後で、買った日の古い順。
export function compareLotsForConsumption(
	a: InventoryLot,
	b: InventoryLot,
): number {
	if (a.expiresOn !== b.expiresOn) {
		if (a.expiresOn === null) {
			return 1;
		}

		if (b.expiresOn === null) {
			return -1;
		}

		return a.expiresOn < b.expiresOn ? -1 : 1;
	}

	if (a.acquiredOn !== b.acquiredOn) {
		return a.acquiredOn < b.acquiredOn ? -1 : 1;
	}

	if (a.createdAt !== b.createdAt) {
		return a.createdAt < b.createdAt ? -1 : 1;
	}

	return a.id < b.id ? -1 : 1;
}

export function sortLotsForConsumption(
	lots: readonly InventoryLot[],
): InventoryLot[] {
	return [...lots].sort(compareLotsForConsumption);
}

/**
 * 追加するとき、同じ条件のロットがあれば、そこへ合体する。
 * 条件：保存方法、期限の日付・種類・出所が同じ。期限がないロットは、買った日も同じ（同じ日に買ったものだけ）。
 */
export function findMergeableLot(
	lots: readonly InventoryLot[],
	conditions: InventoryLotConditions,
): InventoryLot | undefined {
	return lots.find(
		(lot) =>
			lot.storage === conditions.storage &&
			lot.expiresOn === conditions.expiresOn &&
			lot.expiryKind === conditions.expiryKind &&
			lot.expirySource === conditions.expirySource &&
			(conditions.expiresOn !== null ||
				lot.acquiredOn === conditions.acquiredOn),
	);
}

/**
 * 数量を、ロットに自動で割り振る（期限の早い順）。
 * 足りないとき、「正確に管理」はエラー。「だいたいで管理」は、すべてのロットを空にし、
 * 足りない分は、最後のロットの数量に上乗せして返す（記録には、要求した数量が残る）。
 */
export function allocateDecrease(
	lots: readonly InventoryLot[],
	quantity: number,
	trackingMode: InventoryTrackingMode,
): InventoryLotAllocation[] {
	const stockedLots = sortLotsForConsumption(
		lots.filter((lot) => lot.quantity > 0),
	);

	if (sumLotQuantities(stockedLots) < quantity && trackingMode === "exact") {
		throw new Error("在庫数量が不足しています");
	}

	const allocations: InventoryLotAllocation[] = [];
	let remaining = quantity;

	for (const lot of stockedLots) {
		if (remaining <= 0) {
			break;
		}

		const taken = Math.min(lot.quantity, remaining);

		allocations.push({ lotId: lot.id, quantity: roundQuantity(taken) });
		remaining = roundQuantity(remaining - taken);
	}

	// 「だいたいで管理」で足りない分は、最後のロットに上乗せする（そのロットは、0になる）。
	const lastAllocation = allocations.at(-1);

	if (remaining > 0 && lastAllocation) {
		lastAllocation.quantity = roundQuantity(
			lastAllocation.quantity + remaining,
		);
	}

	return allocations;
}

/**
 * ユーザーがロットごとに指定した数量を検証する。
 * ロットが、その食材のものであること、重複がないこと、数量が正であること。
 * 「正確に管理」では、ロットの数量を超えられない（「だいたい」は、0までに丸める）。
 */
export function validateManualAllocations(
	lots: readonly InventoryLot[],
	allocations: readonly InventoryLotAllocation[],
	trackingMode: InventoryTrackingMode,
): InventoryLotAllocation[] {
	const lotsById = new Map(lots.map((lot) => [lot.id, lot]));
	const seenLotIds = new Set<string>();

	for (const allocation of allocations) {
		const lot = lotsById.get(allocation.lotId);

		if (!lot) {
			throw new Error("ロットが見つかりません");
		}

		if (seenLotIds.has(allocation.lotId)) {
			throw new Error("同じロットが、重複して指定されています");
		}

		seenLotIds.add(allocation.lotId);

		if (!(allocation.quantity > 0) || !Number.isFinite(allocation.quantity)) {
			throw new Error("ロットの数量は、0より大きくしてください");
		}

		if (trackingMode === "exact" && allocation.quantity > lot.quantity) {
			throw new Error("在庫数量が不足しています");
		}
	}

	return allocations.map((allocation) => ({ ...allocation }));
}

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;

// 「2026-02-30」のような、存在しない日付を弾く。
export function isValidDateString(value: string): boolean {
	const match = datePattern.exec(value);

	if (!match) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);

	return (
		!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
	);
}

// 日付（YYYY-MM-DD）に、日数を足す（クイック入力の「+3日」など）。
export function addDays(value: string, days: number): string {
	const date = new Date(`${value}T00:00:00.000Z`);

	date.setUTCDate(date.getUTCDate() + days);

	return date.toISOString().slice(0, 10);
}

/**
 * ロットの条件の入力を、既定値で補って、確定した条件にする。
 * - 買った日は、省略すると今日。
 * - 期限の日付があるときの出所は、省略すると「入力」。日付がなければ、出所はなし。
 * - 日付がないときの期限の種類は、「なし」の指定だけを残す（種類だけでは、意味がないため）。
 */
export function resolveLotConditions(
	input: InventoryLotInput | undefined,
	today: string,
): InventoryLotConditions {
	const expiresOn = input?.expiresOn ?? null;

	return {
		acquiredOn: input?.acquiredOn ?? today,
		storage: input?.storage ?? null,
		expiresOn,
		expiryKind:
			expiresOn !== null
				? (input?.expiryKind ?? null)
				: input?.expiryKind === "none"
					? "none"
					: null,
		expirySource:
			expiresOn !== null ? (input?.expirySource ?? "entered") : null,
	};
}
