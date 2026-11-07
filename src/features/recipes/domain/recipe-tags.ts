// レシピのタグ。
// 公開用のタグ：決まった語の一覧から選ぶ（自由入力にしない。審査が要らず、検索の語がそろう）。全員に見える。
// 個人用のタグ：自由入力。本人にしか見えない（他の人に返す取得では、読まない）。
//
// 【公開用の語を変えるとき】キーは、一度決めたら変えない（保存されている値なので）。
// 語を外すときは、保存済みの値も消すマイグレーション（array_remove）を、新しく足す。

export const publicRecipeTagCategories = [
	{
		label: "料理の分類",
		tags: [
			["main_dish", "主菜"],
			["side_dish", "副菜"],
			["soup", "汁物"],
			["rice_dish", "ご飯もの"],
			["noodle", "麺類"],
			["bread", "パン"],
			["one_plate", "ワンプレート"],
			["salad", "サラダ"],
			["appetizer", "おつまみ"],
			["snack", "軽食"],
			["sweets", "スイーツ"],
			["drink", "ドリンク"],
			["sauce", "ソース・たれ"],
			["pickles", "漬物・保存食"],
		],
	},
	{
		label: "味わい・食感",
		tags: [
			["refreshing", "さっぱり"],
			["rich", "こってり"],
			["sweet", "甘め"],
			["spicy", "辛め"],
			["hot_spicy", "ピリ辛"],
			["sour", "酸味"],
			["salty", "塩味"],
			["mild", "マイルド"],
			["crispy", "カリカリ"],
			["crunchy", "シャキシャキ"],
			["creamy", "クリーミー"],
			["fluffy", "ふわふわ"],
			["chewy", "もちもち"],
		],
	},
	{
		label: "時間・手間",
		tags: [
			["quick", "時短"],
			["easy", "簡単"],
			["no_cook", "火を使わない"],
			["microwave", "電子レンジ"],
			["one_pan", "ワンパン"],
			["make_ahead", "作り置き向き"],
			["batch_cooking", "大量調理向き"],
			["beginner", "初心者向き"],
			["advanced", "本格派"],
		],
	},
	{
		label: "特徴",
		tags: [
			["healthy", "ヘルシー"],
			["vegetable_rich", "野菜たっぷり"],
			["budget", "節約"],
		],
	},
	{
		label: "食べる場面",
		tags: [
			["bento", "お弁当向き"],
			["breakfast", "朝食"],
			["lunch", "昼食"],
			["dinner", "夕食"],
			["party", "パーティー"],
			["hospitality", "おもてなし"],
			["picnic", "ピクニック"],
			["camping", "キャンプ"],
			["kids", "子ども向き"],
			["family", "家族向き"],
			["late_night", "夜食"],
		],
	},
	{
		label: "調理方法",
		tags: [
			["grilled", "焼く"],
			["fried", "揚げる"],
			["stir_fried", "炒める"],
			["simmered", "煮る"],
			["steamed", "蒸す"],
			["baked", "オーブン"],
			["boiled", "茹でる"],
			["raw", "生食"],
			["fermented", "発酵"],
			["air_fryer", "ノンフライヤー"],
		],
	},
	{
		label: "季節・行事",
		tags: [
			["spring", "春"],
			["summer", "夏"],
			["autumn", "秋"],
			["winter", "冬"],
			["new_year", "お正月"],
			["christmas", "クリスマス"],
			["halloween", "ハロウィン"],
			["valentines", "バレンタイン"],
		],
	},
] as const;

type PublicRecipeTagEntry =
	(typeof publicRecipeTagCategories)[number]["tags"][number];

export type PublicRecipeTag = PublicRecipeTagEntry[0];

export const publicRecipeTagLabels: ReadonlyMap<PublicRecipeTag, string> =
	new Map(
		publicRecipeTagCategories.flatMap((category) =>
			category.tags.map(([tag, label]): [PublicRecipeTag, string] => [
				tag,
				label,
			]),
		),
	);

export const publicRecipeTags: readonly PublicRecipeTag[] = [
	...publicRecipeTagLabels.keys(),
];

export function isPublicRecipeTag(value: string): value is PublicRecipeTag {
	return publicRecipeTags.some((tag) => tag === value);
}

export function publicRecipeTagLabel(tag: PublicRecipeTag): string {
	return publicRecipeTagLabels.get(tag) ?? tag;
}

export const recipeTagLimits = {
	maxPublicTags: 5,
	maxPersonalTags: 10,
	personalTagMaxLength: 20,
	// みんなのレシピで、一度に絞り込みに使える公開用のタグの数。
	maxSearchTags: 5,
} as const;

// 語の一覧の順に並べる（選んだ順ではなく、いつも同じ並びで見せる・保存する）。
export function sortPublicRecipeTags(
	tags: readonly PublicRecipeTag[],
): PublicRecipeTag[] {
	return publicRecipeTags.filter((tag) => tags.includes(tag));
}

// 個人用のタグの入力を、保存する形にする（前後の空白を除く）。空なら null。
export function normalizePersonalTag(text: string): string | null {
	const tag = text.trim();

	return tag.length === 0 ? null : tag;
}

// 公開用のタグを付ける・外す。上限に達しているときは、付けない（そのまま返す）。
export function togglePublicRecipeTag(
	tags: readonly PublicRecipeTag[],
	tag: PublicRecipeTag,
): PublicRecipeTag[] {
	if (tags.includes(tag)) {
		return tags.filter((current) => current !== tag);
	}

	if (tags.length >= recipeTagLimits.maxPublicTags) {
		return [...tags];
	}

	return sortPublicRecipeTags([...tags, tag]);
}

// 個人用のタグを足す。足せないときは、画面に出す文。
export function addPersonalRecipeTag(
	tags: readonly string[],
	text: string,
):
	| { status: "added"; tags: string[] }
	| { status: "rejected"; message: string } {
	const tag = normalizePersonalTag(text);

	if (tag === null) {
		return { status: "rejected", message: "タグを入れてください" };
	}

	if ([...tag].length > recipeTagLimits.personalTagMaxLength) {
		return {
			status: "rejected",
			message: `タグは1つ${recipeTagLimits.personalTagMaxLength}文字までです`,
		};
	}

	if (tags.includes(tag)) {
		return { status: "rejected", message: "同じタグがすでにあります" };
	}

	if (tags.length >= recipeTagLimits.maxPersonalTags) {
		return {
			status: "rejected",
			message: `個人用のタグは${recipeTagLimits.maxPersonalTags}個までです`,
		};
	}

	return { status: "added", tags: [...tags, tag] };
}

// 見る人に返す個人用のタグ。本人でなければ、いつも空（他の人に、個人用のタグを見せない）。
export function visiblePersonalTags(
	owner: { userId: string; personalTags: readonly string[] },
	viewerUserId: string,
): string[] {
	return owner.userId === viewerUserId ? [...owner.personalTags] : [];
}
