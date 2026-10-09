import { describe, expect, it } from "vitest";
import type {
	Profile,
	ProfileRepository,
	UpdateProfileInput,
} from "./profile-repository";
import { updateProfile } from "./update-profile";

function createRepository(
	result: "updated" | "handle-taken" | "not-found" = "updated",
) {
	const updates: UpdateProfileInput[] = [];
	const repository: ProfileRepository = {
		get: async (): Promise<Profile | null> => null,
		update: async (input) => {
			updates.push(input);

			return result;
		},
	};

	return { repository, updates };
}

describe("updateProfile", () => {
	it("整えた表示名とハンドルで、更新する", async () => {
		const { repository, updates } = createRepository();
		const result = await updateProfile(repository, {
			name: "  たろう ",
			handle: "＠Taro_Cook",
		});

		expect(result).toEqual({ ok: true });
		expect(updates).toEqual([{ name: "たろう", handle: "taro_cook" }]);
	});

	it("検証に失敗したら、更新せずに、項目ごとの文を返す", async () => {
		const { repository, updates } = createRepository();
		const result = await updateProfile(repository, {
			name: "taro@example.com",
			handle: "ab",
		});

		expect(result).toEqual({
			ok: false,
			errors: {
				name: "表示名に、@ は使えません（メールアドレスを入れないためです）。",
				handle: "ハンドルは3文字以上にしてください。",
			},
		});
		expect(updates).toEqual([]);
	});

	it("ハンドルが重なるときは、ハンドルの欄に、使われている旨を返す", async () => {
		const { repository } = createRepository("handle-taken");

		expect(
			await updateProfile(repository, { name: "たろう", handle: "taro" }),
		).toEqual({
			ok: false,
			errors: { handle: "このハンドルは、すでに使われています。" },
		});
	});

	it("ユーザーがいないときは、全体のエラーを返す", async () => {
		const { repository } = createRepository("not-found");

		expect(
			await updateProfile(repository, { name: "たろう", handle: "taro" }),
		).toEqual({
			ok: false,
			errors: { form: "ユーザーが見つかりませんでした。" },
		});
	});
});
