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
