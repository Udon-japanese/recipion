import { parseIngredientLine } from "#/features/ingredients/domain/parse-ingredient-line";

// 買い物のメモ（1行に1つ）を、買い物メモの項目の元に読む（純粋な関数）。
// 文章が正ではなく、確認のあと一覧に追加するための、一方向の入力。
//
// 1行の形：
//   卵 10個 / 牛乳 2 / 豚こま 300g / にんにくチューブ   … 名前と数量（単位がない数字は「個」）
//   卵 10個 @イオン                                    … その項目だけ、その店
//   イオン（見出しの行）                                … 以降の行は、その店（登録済みの店の名前だけ）
//   @イオン（見出しの行）                                … 同じ。見出しは、登録のない店でも、読む（店は付かない）

export type ShoppingMemoStore = { id: string; name: string };

export type ParsedShoppingMemoLine = {
	rawText: string;
	name: string;
	quantity: number;
	// 単位がない数字は「個」。数量も単位もなければ、null。
	unitLabel: string | null;
	storeId: string | null;
	// 指定された店が、登録になかったとき、その名前（店は付けない）。
	unknownStoreName: string | null;
};

// レシピの計量の単位や、数量を決められない分量は、買い物の数量としては読まない（名前だけを使う）。
const recipeOnlyUnits = new Set([
	"大さじ",
	"小さじ",
	"カップ",
	"ひとつまみ",
	"かけ",
	"cc",
	"cm",
	"つ",
]);

const defaultUnit = "個";

// 見出しの飾り（＜＞・【】・■・☆・@ など）と、末尾の「:」。
const headingDecoration =
	/^[＜<【[［■□◆◇▼▽●○◎＃#《〈☆★@]+|[＞>】\]］》〉:]+$/gu;

function normalizeStoreName(name: string): string {
	return name.normalize("NFKC").trim().toLowerCase();
}

function toNumber(text: string): number {
	const fraction = text.match(/^(\d+)\/(\d+)$/u);

	if (fraction) {
		return Number(fraction[1]) / Number(fraction[2]);
	}

	return Number(text);
}

type Quantity = { name: string; quantity: number; unitLabel: string | null };

// 1行から、名前と数量・単位を読む。
function parseItemText(text: string): Quantity | null {
	// 「卵 ×3」「卵x3」：個数。
	const times = text.match(/^(?<name>.+?)\s*[×xX]\s*(?<count>\d+)$/u);

	if (times?.groups?.name && times.groups.count) {
		return {
			name: times.groups.name.trim(),
			quantity: Number(times.groups.count),
			unitLabel: defaultUnit,
		};
	}

	const parsed = parseIngredientLine(text);

	if (!parsed) {
		return null;
	}

	if (parsed.status === "parsed") {
		if (
			parsed.quantity !== null &&
			parsed.unitLabel !== null &&
			!recipeOnlyUnits.has(parsed.unitLabel) &&
			parsed.quantity > 0
		) {
			return {
				name: parsed.name.trim(),
				quantity: parsed.quantity,
				unitLabel: parsed.unitLabel,
			};
		}

		// 「塩 少々」「醤油 大さじ2」など：分量は、買い物の数量としては使わず、名前だけにする。
		return { name: parsed.name.trim(), quantity: 1, unitLabel: null };
	}

	// 「牛乳 2」「レタス 1/2」：単位がない数字は、いちばん一般的な「個」にする。
	const unitless = text.match(
		/^(?<name>.*[^\d\s/.])\s*(?<number>\d+\/\d+|\d+(?:\.\d+)?)$/u,
	);

	if (unitless?.groups?.name && unitless.groups.number) {
		const quantity = toNumber(unitless.groups.number);

		if (Number.isFinite(quantity) && quantity > 0) {
			return {
				name: unitless.groups.name.trim(),
				quantity,
				unitLabel: defaultUnit,
			};
		}
	}

	return { name: parsed.name.trim(), quantity: 1, unitLabel: null };
}

type StoreTarget = { storeId: string | null; unknownName: string | null };

export function parseShoppingMemo(
	text: string,
	stores: readonly ShoppingMemoStore[],
): ParsedShoppingMemoLine[] {
	const storesByName = new Map(
		stores.map((store) => [normalizeStoreName(store.name), store]),
	);
	const lines: ParsedShoppingMemoLine[] = [];
	// 見出しで切り替わる、いまの店。
	let current: StoreTarget = { storeId: null, unknownName: null };

	function resolve(name: string): StoreTarget {
		const store = storesByName.get(normalizeStoreName(name));

		return store
			? { storeId: store.id, unknownName: null }
			: { storeId: null, unknownName: name.trim() };
	}

	for (const rawLine of text.split("\n")) {
		const rawText = rawLine.trim();

		if (rawText === "") {
			continue;
		}

		const normalized = rawText.normalize("NFKC");
		const headingText = normalized.replace(headingDecoration, "").trim();

		// 見出しの行：登録済みの店の名前だけの行、または「@店名」だけの行。
		if (
			headingText !== "" &&
			(storesByName.has(normalizeStoreName(headingText)) ||
				normalized.startsWith("@"))
		) {
			current = resolve(headingText);
			continue;
		}

		// 行の終わりの「@店名」：その項目だけの店。
		const inlineStore = normalized.match(
			/^(?<body>.*?)\s*@(?<store>[^\s@]+)$/u,
		);
		const body = inlineStore?.groups?.body?.trim() ?? normalized;
		const target = inlineStore?.groups?.store
			? resolve(inlineStore.groups.store)
			: current;

		const item = body === "" ? null : parseItemText(body);

		if (!item || item.name === "") {
			continue;
		}

		lines.push({
			rawText,
			name: item.name,
			quantity: item.quantity,
			unitLabel: item.unitLabel,
			storeId: target.storeId,
			unknownStoreName: target.unknownName,
		});
	}

	return lines;
}
