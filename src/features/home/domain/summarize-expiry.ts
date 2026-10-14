// ホームに出す「期限が近い在庫」の件数。日付は YYYY-MM-DD（日本時間）。

// 期限が、今日から数えて、この日数以内のものを「近い」とする（期限切れも含む）。
export const EXPIRY_SOON_DAYS = 3;

type ExpiryLot = { quantity: number; expiresOn: string | null };
type ExpiryItem = { lots: readonly ExpiryLot[] };

export type ExpirySummary = {
	// 期限が近い（期限切れを含む）食材の数。
	soon: number;
	// そのうち、期限が切れている食材の数。
	expired: number;
};

function addDays(date: string, days: number): string {
	const base = new Date(`${date}T00:00:00.000Z`);

	base.setUTCDate(base.getUTCDate() + days);

	return base.toISOString().slice(0, 10);
}

// 食材ごとに数える（在庫のあるロットのうち、1つでも該当すれば1件）。
export function summarizeExpiry(
	items: readonly ExpiryItem[],
	today: string,
): ExpirySummary {
	const limit = addDays(today, EXPIRY_SOON_DAYS);
	let soon = 0;
	let expired = 0;

	for (const item of items) {
		const dates = item.lots
			.filter((lot) => lot.quantity > 0 && lot.expiresOn !== null)
			.map((lot) => lot.expiresOn as string);

		if (dates.some((date) => date < today)) {
			expired += 1;
			soon += 1;
		} else if (dates.some((date) => date <= limit)) {
			soon += 1;
		}
	}

	return { soon, expired };
}
