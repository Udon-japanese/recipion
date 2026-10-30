import type { InventoryZoneId } from "#/features/inventory/domain/inventory-fridge";
import type { ShoppingCategoryId } from "#/features/shopping/domain/shopping-category";

// 在庫画面のUI案（/dev/inventory）用の見本データ。本物の在庫とは無関係。
export type SampleItem = {
	id: string;
	name: string;
	category: ShoppingCategoryId;
	zone: InventoryZoneId;
	// null＝有無だけの食材。
	quantity: number | null;
	present: boolean;
	unit: string;
	// null＝期限なし。
	daysLeft: number | null;
};

export const categoryTint: Record<ShoppingCategoryId, string> = {
	produce: "#d8efd9",
	chilled: "#efe3c8",
	household: "#e6e3dc",
	meat: "#fbd9d0",
	seafood: "#d6e8f5",
	dairy: "#fff0c9",
	eggs: "#fff0c9",
	pantry: "#ecd8bf",
	frozen: "#d6e8f5",
	snacks: "#f6dcea",
	staples: "#f0e4d0",
	beverages: "#d6ecea",
	deli: "#f6dcc0",
	bakery: "#f0e4d0",
	other: "#e6e3dc",
};

// name|カテゴリ|場所|量|単位|期限までの日数
const base = `
牛乳|dairy|fridge|600|ml|1
卵|eggs|fridge|6|個|5
豆腐|chilled|fridge|1|丁|2
納豆|chilled|fridge|3|パック|3
鶏もも肉|meat|fridge|400|g|1
豚こま切れ肉|meat|fridge|200|g|-1
鮭の切り身|seafood|fridge|2|切れ|2
ヨーグルト|dairy|fridge|400|g|6
ハム|meat|fridge|4|枚|7
とろけるチーズ|dairy|fridge|100|g|20
キムチ|chilled|fridge|250|g|14
油揚げ|chilled|fridge|2|枚|4
玉ねぎ|produce|vegetable|3|個|
にんじん|produce|vegetable|2|本|10
キャベツ|produce|vegetable|0.5|玉|6
じゃがいも|produce|vegetable|4|個|
ほうれん草|produce|vegetable|1|束|2
トマト|produce|vegetable|3|個|4
きゅうり|produce|vegetable|2|本|3
長ねぎ|produce|vegetable|1|本|7
しいたけ|produce|vegetable|1|パック|3
りんご|produce|vegetable|2|個|12
冷凍うどん|frozen|freezer|3|玉|90
冷凍餃子|frozen|freezer|12|個|60
鶏むね肉|meat|freezer|300|g|30
冷凍ブロッコリー|frozen|freezer|150|g|45
アイス|frozen|freezer|4|個|
食パン|staples|freezer|4|枚|20
醤油|pantry|door||有無|
みりん|pantry|door||有無|
マヨネーズ|pantry|door||有無|
ケチャップ|pantry|door||有無|
めんつゆ|pantry|door||有無|
味噌|pantry|door||有無|
バター|dairy|door||有無|
米|staples|table|3|kg|
パスタ|staples|table|500|g|
小麦粉|staples|table|400|g|180
ホットケーキミックス|staples|table|400|g|170
バナナ|produce|table|3|本|2
カップ麺|staples|table|2|個|200
ツナ缶|pantry|table|3|缶|300
`;

// 「たくさん」にしたときに足す食材（場所ごと）。
const extra: Record<InventoryZoneId, [string, ShoppingCategoryId][]> = {
	fridge: [
		["ベーコン", "meat"],
		["ひき肉", "meat"],
		["ちくわ", "chilled"],
		["明太子", "seafood"],
		["生クリーム", "dairy"],
		["クリームチーズ", "dairy"],
		["こんにゃく", "chilled"],
		["餃子の皮", "chilled"],
		["豆乳", "chilled"],
		["漬物", "other"],
		["焼き豚", "meat"],
		["温泉卵", "eggs"],
		["さつま揚げ", "chilled"],
		["春巻きの皮", "chilled"],
	],
	vegetable: [
		["ピーマン", "produce"],
		["なす", "produce"],
		["大根", "produce"],
		["白菜", "produce"],
		["小松菜", "produce"],
		["もやし", "produce"],
		["ごぼう", "produce"],
		["れんこん", "produce"],
		["みかん", "produce"],
		["レモン", "produce"],
		["しょうが", "produce"],
		["にんにく", "produce"],
		["さつまいも", "produce"],
		["かぼちゃ", "produce"],
	],
	freezer: [
		["冷凍ごはん", "frozen"],
		["冷凍ほうれん草", "frozen"],
		["冷凍えび", "frozen"],
		["冷凍コーン", "frozen"],
		["ミートボール", "frozen"],
		["たこ焼き", "frozen"],
		["保冷剤", "household"],
		["氷", "household"],
		["冷凍いちご", "frozen"],
		["ささみ", "meat"],
	],
	door: [
		["ごま油", "pantry"],
		["ポン酢", "pantry"],
		["ソース", "pantry"],
		["マスタード", "pantry"],
		["わさび", "pantry"],
		["からし", "pantry"],
		["ジャム", "pantry"],
		["焼肉のたれ", "pantry"],
		["ドレッシング", "pantry"],
		["お茶", "beverages"],
	],
	table: [
		["砂糖", "pantry"],
		["塩", "pantry"],
		["片栗粉", "pantry"],
		["パン粉", "staples"],
		["そうめん", "staples"],
		["乾燥わかめ", "other"],
		["かつお節", "other"],
		["オリーブオイル", "pantry"],
		["ごま", "pantry"],
		["海苔", "other"],
		["カレールー", "pantry"],
		["インスタントコーヒー", "beverages"],
		["はちみつ", "pantry"],
		["お菓子", "snacks"],
	],
};

function parse(source: string): SampleItem[] {
	return source
		.trim()
		.split("\n")
		.map((line, index) => {
			const [name = "", category = "その他", zone = "fridge", qty, unit, days] =
				line.split("|");

			return {
				id: `s${index}`,
				name,
				category: category as ShoppingCategoryId,
				zone: zone as InventoryZoneId,
				quantity: qty ? Number(qty) : null,
				present: qty === "" || qty === undefined ? index % 5 !== 3 : true,
				unit: unit ?? "",
				daysLeft: days ? Number(days) : null,
			};
		});
}

export const baseItems: SampleItem[] = parse(base);

export const manyItems: SampleItem[] = [
	...baseItems,
	...(
		Object.entries(extra) as [InventoryZoneId, [string, ShoppingCategoryId][]][]
	).flatMap(([zone, entries]) =>
		entries.map(([name, category], index): SampleItem => {
			const isPresence = zone === "door";

			return {
				id: `x-${zone}-${index}`,
				name,
				category,
				zone,
				quantity: isPresence ? null : ((index * 3) % 7) + 1,
				present: index % 4 !== 3,
				unit: isPresence ? "有無" : index % 2 === 0 ? "個" : "パック",
				daysLeft:
					zone === "table" || index % 3 === 0 ? null : ((index * 5) % 14) - 1,
			};
		}),
	),
];

export function describeAmount(item: SampleItem): string {
	if (item.quantity === null) {
		return item.present ? "あり" : "なし";
	}

	return `${item.quantity}${item.unit}`;
}

export type ExpiryLevel = "expired" | "soon" | "near";

export function describeExpiry(
	item: SampleItem,
): { level: ExpiryLevel; text: string } | null {
	const days = item.daysLeft;

	if (days === null || days > 3) {
		return null;
	}

	if (days < 0) {
		return { level: "expired", text: "切れ" };
	}

	if (days === 0) {
		return { level: "soon", text: "今日" };
	}

	if (days === 1) {
		return { level: "soon", text: "明日" };
	}

	return { level: "near", text: `${days}日` };
}

export function compareByExpiry(a: SampleItem, b: SampleItem): number {
	if (a.daysLeft === b.daysLeft) {
		return a.name.localeCompare(b.name, "ja");
	}

	if (a.daysLeft === null) {
		return 1;
	}

	if (b.daysLeft === null) {
		return -1;
	}

	return a.daysLeft - b.daysLeft;
}
