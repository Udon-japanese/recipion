// 「つくった！」の記録に使う、純粋な関数と型。
import type { Avatar } from "#/features/avatar/domain/avatar";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import { toDateString } from "#/features/inventory/domain/inventory-lot";

export type RecipeCookEntry = {
	id: string;
	// つくった日時（ISO 8601）。
	cookedAt: string;
	// いま開けるレシピなら、いまの名前。消された・見られなくなったレシピは、つくったときの名前。
	recipeName: string;
	// いま開けるレシピの公開 ID（開けなければ null。一覧で、リンクにしない）。
	publicId: string | null;
	cover: DishPlacement[] | null;
	// つくった量（「2人分」）。
	yieldText: string;
	// いま開ける、他の人のレシピの作者（自分のレシピと、開けないレシピは null）。
	author: { name: string; handle: string; avatar: Avatar } | null;
};

export type RecipeCookPage = {
	entries: RecipeCookEntry[];
	// 続きがあるときだけ入る（次のページを取るときに、そのまま渡す）。
	nextCursor: string | null;
};

// レシピの画面に出す、自分がそのレシピをつくった回数と、最後につくった日時（ISO 8601。なければ null）。
export type RecipeCookStats = {
	count: number;
	lastCookedAt: string | null;
};

export const recipeCookPageSize = 30;

// 続きの取り方：「つくった日時|記録の ID」（日時は、データベースが返した文字のまま。精度を落とさないため）。
const cursorPattern =
	/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?[+-]\d{2}(?::\d{2})?)\|([0-9a-f-]{36})$/u;

export type RecipeCookCursor = { cookedAt: string; id: string };

export function formatRecipeCookCursor(cursor: RecipeCookCursor): string {
	return `${cursor.cookedAt}|${cursor.id}`;
}

export function parseRecipeCookCursor(value: string): RecipeCookCursor | null {
	const match = value.match(cursorPattern);

	return match ? { cookedAt: match[1], id: match[2] } : null;
}

export type RecipeCookDay = {
	// 日本時間の日付（YYYY-MM-DD）。
	date: string;
	entries: RecipeCookEntry[];
};

// 新しい順の記録を、日本時間の日付ごとにまとめる（順番はそのまま）。
export function groupRecipeCooksByDate(
	entries: readonly RecipeCookEntry[],
): RecipeCookDay[] {
	const days: RecipeCookDay[] = [];

	for (const entry of entries) {
		const date = toDateString(new Date(entry.cookedAt));
		const last = days.at(-1);

		if (last?.date === date) {
			last.entries.push(entry);
		} else {
			days.push({ date, entries: [entry] });
		}
	}

	return days;
}

// 日付（YYYY-MM-DD）を「2026年11月5日（木）」の形にする。
export function formatCookDate(date: string): string {
	const [year, month, day] = date.split("-").map(Number);
	const weekday = "日月火水木金土"[
		new Date(Date.UTC(year, month - 1, day)).getUTCDay()
	];

	return `${year}年${month}月${day}日（${weekday}）`;
}

// 日時（ISO 8601）を、日本時間の「2026年11月5日」の形にする。
export function formatRecipeDate(iso: string): string {
	const [year, month, day] = toDateString(new Date(iso)).split("-").map(Number);

	return `${year}年${month}月${day}日`;
}

export type RecipeDates = {
	createdAt: string;
	// 公開した日時（非公開なら null）。
	publishedAt: string | null;
	updatedAt: string;
};

// レシピの画面に出す日付：公開したレシピは「公開」、非公開は「登録」。
// 「更新」は、その日より後の日（日本時間）に保存し直したときだけ（同じ日の直しや、公開の操作だけでは出さない）。
export function describeRecipeDates(
	dates: RecipeDates,
): { label: string; date: string }[] {
	const base = dates.publishedAt ?? dates.createdAt;
	const items = [
		{
			label: dates.publishedAt ? "公開" : "登録",
			date: formatRecipeDate(base),
		},
	];

	if (toDateString(new Date(dates.updatedAt)) > toDateString(new Date(base))) {
		items.push({ label: "更新", date: formatRecipeDate(dates.updatedAt) });
	}

	return items;
}
