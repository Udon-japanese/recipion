import { hashSeed } from "#/features/dish-art/domain/dish-placeholder";
import { type Avatar, parseAvatar } from "./avatar";

export type AvatarPreset = Avatar & { id: string; label: string };

// 用意したアバター（食材に顔）。作っていない人には、ユーザーごとに決まった1つを出す。
export const avatarPresets: readonly AvatarPreset[] = [
	{
		id: "egg",
		label: "ゆでたまご",
		background: "yolk",
		placements: [
			{ partId: "boiled-egg", x: 50, y: 49.5, scale: 1.25 },
			{ partId: "face-eyes", x: 50, y: 47, scale: 0.7 },
			{ partId: "face-cheeks", x: 50, y: 56, scale: 0.75 },
			{ partId: "face-mouth-smile", x: 50, y: 60, scale: 0.55 },
		],
	},
	{
		id: "onigiri",
		label: "おにぎり",
		background: "mint",
		placements: [
			{ partId: "onigiri", x: 49.4, y: 51, scale: 1.15 },
			{ partId: "face-eyes", x: 50, y: 46, scale: 0.6 },
			{ partId: "face-cheeks", x: 50, y: 54, scale: 0.7 },
			{ partId: "face-mouth-cat", x: 50, y: 56, scale: 0.5 },
		],
	},
	{
		id: "tomato",
		label: "トマト",
		background: "cream",
		placements: [
			{ partId: "tomato", x: 50, y: 49.6, scale: 1.2 },
			{ partId: "face-eyes-smile", x: 50, y: 53, scale: 0.75 },
			{ partId: "face-cheeks", x: 50, y: 61, scale: 0.85 },
			{ partId: "face-mouth-open", x: 50, y: 66, scale: 0.6 },
		],
	},
	{
		id: "shokupan",
		label: "食パン",
		background: "sky",
		placements: [
			{ partId: "shokupan", x: 50, y: 50, scale: 1.05 },
			{ partId: "face-eyes-sparkle", x: 50, y: 51, scale: 0.7 },
			{ partId: "face-cheeks", x: 50, y: 60, scale: 0.85 },
			{ partId: "face-mouth-smile", x: 50, y: 64, scale: 0.55 },
		],
	},
	{
		id: "eggplant",
		label: "なす",
		background: "lavender",
		placements: [
			{ partId: "eggplant", x: 49, y: 56, scale: 1.1, rotate: -20 },
			{ partId: "face-eyes", x: 46, y: 62, scale: 0.6, tint: "#ffffff" },
			{
				partId: "face-mouth-smile",
				x: 46,
				y: 71,
				scale: 0.45,
				tint: "#ffffff",
			},
		],
	},
	{
		id: "potato",
		label: "じゃがいも",
		background: "peach",
		placements: [
			{ partId: "potato", x: 49.5, y: 48.2, scale: 1.1 },
			{ partId: "face-eyes", x: 50, y: 49, scale: 0.7 },
			{ partId: "face-cheeks", x: 50, y: 57, scale: 0.85 },
			{ partId: "face-mouth-smile", x: 50, y: 61, scale: 0.55 },
		],
	},
	{
		id: "tofu",
		label: "豆腐",
		background: "sky",
		placements: [
			{ partId: "tofu", x: 47.5, y: 47, scale: 1.25 },
			{ partId: "face-eyes-wink", x: 50, y: 49, scale: 0.7 },
			{ partId: "face-cheeks", x: 50, y: 57, scale: 0.85 },
			{ partId: "face-mouth-cat", x: 50, y: 60, scale: 0.55 },
		],
	},
	{
		id: "pancake",
		label: "ホットケーキ",
		background: "butter",
		placements: [
			{ partId: "pancake", x: 50, y: 52, scale: 1 },
			{ partId: "face-eyes-sparkle", x: 50, y: 57, scale: 0.6 },
			{ partId: "face-mouth-open", x: 50, y: 67, scale: 0.45 },
		],
	},
	{
		id: "nikuman",
		label: "肉まん",
		background: "peach",
		placements: [
			{ partId: "nikuman", x: 50, y: 51.5, scale: 1.0 },
			{ partId: "face-eyes-smile", x: 50, y: 55, scale: 0.7 },
			{ partId: "face-cheeks", x: 50, y: 62, scale: 0.85 },
			{ partId: "face-mouth-smile", x: 50, y: 66, scale: 0.5 },
		],
	},
	{
		id: "umeboshi",
		label: "梅干し",
		background: "mint",
		placements: [
			{ partId: "umeboshi", x: 50, y: 50.6, scale: 1.4 },
			{ partId: "face-eyes", x: 50, y: 52, scale: 0.7, tint: "#ffffff" },
			{ partId: "face-mouth-cat", x: 50, y: 64, scale: 0.55, tint: "#ffffff" },
		],
	},
	{
		id: "onion",
		label: "玉ねぎ",
		background: "lavender",
		placements: [
			{ partId: "onion", x: 50, y: 50.9, scale: 1.1 },
			{ partId: "face-eyes-closed", x: 50, y: 57, scale: 0.65 },
			{ partId: "face-cheeks", x: 50, y: 63, scale: 0.8 },
			{ partId: "face-mouth-cat", x: 50, y: 67, scale: 0.5 },
		],
	},
	{
		id: "chef",
		label: "コックれしぽよ",
		background: "charcoal",
		placements: [
			{ partId: "mascot", x: 50, y: 62, scale: 0.8 },
			{ partId: "chef-hat", x: 50, y: 28, scale: 0.55 },
		],
	},
];

// ユーザーの id から、いつも同じプリセットを選ぶ（まだアバターを作っていない人の、既定のアバター）。
export function defaultAvatarFor(userId: string): AvatarPreset {
	const preset =
		avatarPresets[hashSeed(userId) % avatarPresets.length] ?? avatarPresets[0];

	if (!preset) {
		throw new Error("アバターのプリセットがありません");
	}

	return preset;
}

// 表示に使うアバター。保存した値（壊れていれば、なし）がなければ、ユーザーごとのプリセット。
// 他の人に見せるときは、サーバーでこれを求めて、ユーザーの id は送らない。
export function resolveUserAvatar(userId: string, stored: unknown): Avatar {
	const avatar = parseAvatar(stored);

	if (avatar) {
		return avatar;
	}

	const { background, placements } = defaultAvatarFor(userId);

	return { background, placements };
}
