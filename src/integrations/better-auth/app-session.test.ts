import { describe, expect, it } from "vitest";
import { toAppSession } from "./app-session";

const tomatoAvatar = {
	background: "mint",
	placements: [{ partId: "tomato", x: 50, y: 50 }],
};

function storeWithAvatar(avatar: unknown) {
	return {
		data: {
			user: {
				id: "u2",
				name: "佐藤",
				email: "sato@example.com",
				handle: "sato",
				avatar,
			},
			session: { token: "secret" },
		},
		isPending: false,
	};
}

describe("toAppSession", () => {
	it("表示に使う項目だけを返す（トークンなどは含めない）", () => {
		expect(toAppSession(storeWithAvatar(tomatoAvatar))).toEqual({
			data: {
				user: {
					id: "u2",
					name: "佐藤",
					email: "sato@example.com",
					handle: "sato",
					avatar: tomatoAvatar,
				},
			},
			isPending: false,
		});
	});

	it("アバターが壊れていれば、なし（ユーザーごとのプリセット）として扱う", () => {
		expect(
			toAppSession(storeWithAvatar({ background: "unknown", placements: [] }))
				.data?.user.avatar,
		).toBe(null);
	});

	it.each([
		["取得中", { data: null, isPending: true }],
		["ログインしていない", { data: null, isPending: false }],
	] as const)("%s は、ユーザーなし", (_label, store) => {
		expect(toAppSession(store)).toEqual(store);
	});
});
