import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import { dishParts } from "#/features/dish-art/domain/dish-part";
import type { MeOperations } from "./me-operations";

function firstPartId() {
	const [part] = dishParts;

	if (!part) {
		throw new Error("部品がありません");
	}

	return part.id;
}

function createOperations(overrides: Partial<MeOperations> = {}): MeOperations {
	return {
		getProfile: vi.fn(),
		updateProfile: vi.fn(async () => ({ ok: true as const })),
		updateAvatar: vi.fn(async (avatar) => ({ avatar })),
		...overrides,
	};
}

function createApp(operations = createOperations()) {
	const app = createTestApiApp({
		me: {
			resolveSession: vi.fn(async () => ({
				db: {} as never,
				userId: "user-1",
			})),
			createOperations: () => operations,
		},
	});

	return { app, operations };
}

function post(
	app: ReturnType<typeof createApp>["app"],
	path: string,
	body: unknown,
) {
	return app.request(`/api/v1/me${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: "Bearer a.b",
		},
		body: JSON.stringify(body),
	});
}

describe("本人の API", () => {
	it("プロフィール：審査で断られても 200 で、欄ごとの文を返す（フォームの欄に出すため）", async () => {
		const { app } = createApp(
			createOperations({
				updateProfile: vi.fn(async () => ({
					ok: false as const,
					errors: { name: "この表示名は使えません" },
				})),
			}),
		);
		const response = await post(app, "/profile", {
			name: "なまえ",
			handle: "namae",
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: false,
			errors: { name: "この表示名は使えません" },
		});
	});

	it("プロフィール：長すぎる入力は、審査の前に 400", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/profile", {
			name: "あ".repeat(201),
			handle: "namae",
		});

		expect(response.status).toBe(400);
		expect(operations.updateProfile).not.toHaveBeenCalled();
	});

	it("アバター：null（プリセットに戻す）を受け付ける", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/avatar", { avatar: null });

		expect(await response.json()).toEqual({ avatar: null });
		expect(operations.updateAvatar).toHaveBeenCalledWith(null);
	});

	it("アバター：決まった背景にないものは 400（保存しない）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/avatar", {
			avatar: {
				background: "neon",
				// 部品は実在するもの（背景だけが違う）。
				placements: [{ partId: firstPartId(), x: 0, y: 0 }],
			},
		});

		expect(response.status).toBe(400);
		expect(operations.updateAvatar).not.toHaveBeenCalled();
	});
});
