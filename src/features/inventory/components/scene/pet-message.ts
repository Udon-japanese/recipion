import type { InventoryTile } from "../../domain/inventory-fridge";

// れしぽよのふきだし：いちばん期限の近い食材を知らせる。
export function describePetMessage(
	tiles: readonly InventoryTile[],
	night: boolean,
): string {
	if (night) {
		return "すやすや…";
	}

	const urgent = tiles
		.filter((tile) => tile.expiry)
		.sort((a, b) => (a.expiry?.daysLeft ?? 0) - (b.expiry?.daysLeft ?? 0));
	const first = urgent[0];

	if (!first?.expiry) {
		return "きょうは期限の近いものはないよ";
	}

	const { daysLeft } = first.expiry;
	const when =
		daysLeft < 0
			? "が切れているよ"
			: daysLeft === 0
				? "はきょうまでだよ"
				: daysLeft === 1
					? "はあしたまでだよ"
					: `はあと${daysLeft}日だよ`;
	const rest = urgent.length > 1 ? `（ほか${urgent.length - 1}件）` : "";

	return `「${first.name}」${when}${rest}`;
}
