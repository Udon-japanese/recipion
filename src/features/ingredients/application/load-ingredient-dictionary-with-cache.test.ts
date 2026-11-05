import { describe, expect, it, vi } from "vitest";
import {
	ACCOUNT_CHANGED_MESSAGE,
	UserFacingError,
} from "#/errors/user-facing-error";
import { buildDictionaryEntry } from "#/test/builders/build-ingredient-dictionary";
import type { IngredientDictionaryCache } from "./ingredient-dictionary-cache";
import { loadIngredientDictionaryWithCache } from "./load-ingredient-dictionary-with-cache";

const owner = "user:a" as const;
const cached = [buildDictionaryEntry({ name: "マイだし" })];
const fresh = [buildDictionaryEntry({ name: "うちのたれ" })];

function createCache(): IngredientDictionaryCache & { saved: unknown[] } {
	const saved: unknown[] = [];

	return {
		saved,
		find: vi.fn(async () => ({
			ownerScope: owner,
			entries: cached,
			cachedAt: "",
		})),
		save: vi.fn(async (_owner, entries) => {
			saved.push(entries);
		}),
	};
}

describe("loadIngredientDictionaryWithCache", () => {
	it("サーバーから取れたら、それを使い、端末に保存する", async () => {
		const cache = createCache();

		await expect(
			loadIngredientDictionaryWithCache(owner, async () => fresh, cache),
		).resolves.toEqual(fresh);
		expect(cache.saved).toEqual([fresh]);
	});

	it.each([
		{
			title: "通信できない → 保存済み",
			error: new TypeError("Failed to fetch"),
			expected: cached,
		},
		{
			title: "アカウントが変わった → 保存済みも使わない",
			error: new UserFacingError(ACCOUNT_CHANGED_MESSAGE),
			expected: [],
		},
	])("$title", async ({ error, expected }) => {
		await expect(
			loadIngredientDictionaryWithCache(
				owner,
				async () => {
					throw error;
				},
				createCache(),
			),
		).resolves.toEqual(expected);
	});
});
