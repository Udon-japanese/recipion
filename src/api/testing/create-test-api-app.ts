import { vi } from "vitest";

import { type ApiDependencies, createApiApp } from "#/api/create-api-app";

// テスト用の API。確かめる機能の依存だけを渡し、ほかは呼ばれない差し替えにする（機能が増えても、各テストを直さない）。
export function createTestApiApp(overrides: Partial<ApiDependencies> = {}) {
	return createApiApp({
		handleAuth: vi.fn(),
		minimumClientVersions: { android: "0.0.0", ios: "0.0.0", web: "0.0.0" },
		shoppingSync: { resolveSession: vi.fn(), createStore: vi.fn() },
		inventory: { resolveSession: vi.fn(), createRepository: vi.fn() },
		recipes: { resolveSession: vi.fn(), createOperations: vi.fn() },
		me: { resolveSession: vi.fn(), createOperations: vi.fn() },
		moderation: { resolveSession: vi.fn(), createOperations: vi.fn() },
		reports: { resolveSession: vi.fn(), createOperations: vi.fn() },
		ingredientDictionary: {
			resolveSession: vi.fn(),
			createRepository: vi.fn(),
		},
		...overrides,
	});
}
