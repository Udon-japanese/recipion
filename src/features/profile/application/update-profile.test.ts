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
				name: "表示名に @ は使えません（メールアドレスを入れないためです）。",
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
			errors: { handle: "このハンドルはすでに使われています。" },
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

	describe("審査（変わった欄だけ）", () => {
		function createRepositoryWith(current: Profile) {
			const updates: UpdateProfileInput[] = [];
			const repository: ProfileRepository = {
				get: async () => current,
				update: async (input) => {
					updates.push(input);

					return "updated";
				},
			};

			return { repository, updates };
		}

		it("変わった欄だけを、審査に渡す。通れば、更新する", async () => {
			const { repository, updates } = createRepositoryWith({
				name: "れしぴょなー",
				handle: "user-abc123",
			});
			const calls: { name?: string; handle?: string }[] = [];
			const result = await updateProfile(
				repository,
				{ name: "たろう", handle: "user-abc123" },
				async (changes) => {
					calls.push(changes);

					return null;
				},
			);

			expect(result).toEqual({ ok: true });
			expect(calls).toEqual([{ name: "たろう" }]);
			expect(updates).toHaveLength(1);
		});

		it("何も変わらなければ、審査しない（AI の枠を使わない）", async () => {
			const { repository } = createRepositoryWith({
				name: "れしぴょなー",
				handle: "user-abc123",
			});
			let called = false;

			await updateProfile(
				repository,
				{ name: "れしぴょなー", handle: "user-abc123" },
				async () => {
					called = true;

					return null;
				},
			);

			expect(called).toBe(false);
		});

		it("断られたら、更新せずに、その文を返す", async () => {
			const { repository, updates } = createRepositoryWith({
				name: "れしぴょなー",
				handle: "user-abc123",
			});
			const result = await updateProfile(
				repository,
				{ name: "あ", handle: "user-abc123" },
				async () => ({ name: "表示名に使えない内容が含まれています。" }),
			);

			expect(result).toEqual({
				ok: false,
				errors: { name: "表示名に使えない内容が含まれています。" },
			});
			expect(updates).toEqual([]);
		});

		it("検証に失敗したときは、審査まで進まない", async () => {
			const { repository } = createRepositoryWith({
				name: "れしぴょなー",
				handle: "user-abc123",
			});
			let called = false;

			await updateProfile(
				repository,
				{ name: "", handle: "user-abc123" },
				async () => {
					called = true;

					return null;
				},
			);

			expect(called).toBe(false);
		});
	});
});
