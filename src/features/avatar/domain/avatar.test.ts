import { describe, expect, it } from "vitest";
import { avatarLimits, parseAvatar } from "./avatar";
import {
	avatarPresets,
	defaultAvatarFor,
	resolveUserAvatar,
} from "./avatar-presets";

const part = { partId: "tomato", x: 50, y: 50 };

describe("parseAvatar", () => {
	it.each([
		["背景が用意した色でない", { background: "red", placements: [part] }],
		["部品がない", { background: "mint", placements: [] }],
		[
			"部品が上限より多い",
			{
				background: "mint",
				placements: Array.from(
					{ length: avatarLimits.maxParts + 1 },
					() => part,
				),
			},
		],
		[
			"知らない部品がある",
			{ background: "mint", placements: [{ ...part, partId: "unknown" }] },
		],
		["形が違う", "tomato"],
	])("%s ときは、なし（既定のアバター）にする", (_, value) => {
		expect(parseAvatar(value)).toBeNull();
	});

	it("正しい値は、そのまま読む", () => {
		const avatar = { background: "mint", placements: [part] };

		expect(parseAvatar(avatar)).toEqual(avatar);
	});
});

describe("avatarPresets", () => {
	it("どのプリセットも、保存できる値になっている（id は重ならない）", () => {
		for (const preset of avatarPresets) {
			expect(
				parseAvatar({
					background: preset.background,
					placements: preset.placements,
				}),
				preset.id,
			).not.toBeNull();
		}

		const ids = avatarPresets.map((preset) => preset.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it("既定のアバターは、同じユーザーなら、いつも同じ", () => {
		expect(defaultAvatarFor("user-1")).toBe(defaultAvatarFor("user-1"));
		expect(avatarPresets).toContain(defaultAvatarFor("user-2"));
	});
});

describe("resolveUserAvatar", () => {
	it("保存した値があれば、それを使い、なければ（壊れていれば）ユーザーごとのプリセットにする", () => {
		const saved = { background: "mint", placements: [part] };
		const { background, placements } = defaultAvatarFor("user-1");

		expect(resolveUserAvatar("user-1", saved)).toEqual(saved);
		expect(resolveUserAvatar("user-1", null)).toEqual({
			background,
			placements,
		});
		expect(resolveUserAvatar("user-1", { broken: true })).toEqual({
			background,
			placements,
		});
	});

	it("ユーザーの id やプリセットの名前は、返さない（他の人に見せる値）", () => {
		expect(Object.keys(resolveUserAvatar("user-1", null)).sort()).toEqual([
			"background",
			"placements",
		]);
	});
});
