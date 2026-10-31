import { formatStockAmount } from "#/features/quantity/domain/format-quantity";
import { expiryKindLabels } from "./expiry-labels";
import { type InventoryTile, inventoryZoneLabels } from "./inventory-fridge";

const spokenUnits: Record<string, string> = { g: "グラム", ml: "ミリリットル" };

export type TileQuantityParts = {
	// だいたいで管理（「約」を付ける）。
	approximate: boolean;
	amount: string;
	unit: string;
};

// 量を、数字と単位に分ける（一覧で、数字を大きく出すため）。有無だけの食材は null。
export function tileQuantityParts(
	tile: InventoryTile,
): TileQuantityParts | null {
	if (tile.trackingMode === "presence") {
		return null;
	}

	return {
		approximate: tile.trackingMode === "estimated",
		amount: formatStockAmount(tile.quantity, tile.stockUnitCode),
		unit: tile.stockUnitLabel,
	};
}

// タイルの量の文字（「約 3個」「250g」「あり」）。見た目と読み上げの両方で使う。
export function describeTileQuantity(tile: InventoryTile): string {
	const parts = tileQuantityParts(tile);

	if (!parts) {
		return tile.isPresent ? "あり" : "なし";
	}

	const amount = `${parts.amount}${parts.unit}`;

	return parts.approximate ? `約 ${amount}` : amount;
}

function formatSpokenDate(value: string): string {
	const [, month, day] = value.split("-");

	return `${Number(month)}月${Number(day)}日`;
}

// 読み上げ用のタイルの名前：食材名、量、ゾーン、期限（札が出ているときだけ）、ロット数。
export function describeInventoryTile(tile: InventoryTile): string {
	const quantity = describeTileQuantity(tile).replace(
		/(\d)(g|ml)$/u,
		(_, digit: string, unit: string) => `${digit}${spokenUnits[unit]}`,
	);
	const parts = [tile.name, quantity, inventoryZoneLabels[tile.zone]];

	if (tile.expiry) {
		const { expiry } = tile;

		if (expiry.level === "expired") {
			parts.push("期限切れ");
		} else {
			const kind =
				expiry.kind && expiry.kind !== "none"
					? expiryKindLabels[expiry.kind]
					: "期限";

			parts.push(
				`${kind} ${formatSpokenDate(expiry.expiresOn)}`,
				expiry.daysLeft === 0 ? "今日まで" : `あと${expiry.daysLeft}日`,
			);
		}
	}

	return parts.join("、");
}
