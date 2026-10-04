import type { InventoryExpiryKind, InventoryStorage } from "./inventory-lot";

export const expiryKindLabels: Record<InventoryExpiryKind, string> = {
	"use-by": "消費期限",
	"best-before": "賞味期限",
	none: "期限なし",
};

export const storageLabels: Record<InventoryStorage, string> = {
	room: "常温",
	fridge: "冷蔵",
	freezer: "冷凍",
};

// 「2026-10-01」を「10/1」と表示する。
export function formatShortDate(value: string): string {
	const [, month, day] = value.split("-");

	return `${Number(month)}/${Number(day)}`;
}

const weekdays = ["日", "月", "火", "水", "木", "金", "土"] as const;

// 「2026-10-05」を「10/5（月）」と表示する（日付の入力で、今日が何曜日か、分かるようにする）。
export function formatDateWithWeekday(value: string): string {
	const date = new Date(`${value}T00:00:00.000Z`);

	return `${formatShortDate(value)}（${weekdays[date.getUTCDay()]}）`;
}
