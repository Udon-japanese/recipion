import { describe, expect, it, vi } from "vitest";
import { createLinkLookupCache } from "./link-lookup-cache";

function setup() {
	let time = 0;
	const searchUsers = vi.fn(async (query: string) => [
		{ handle: `u-${query}`, name: "たろう" },
	]);
	const loadUserRecipes = vi.fn(async () => []);
	const cache = createLinkLookupCache({
		searchUsers,
		loadUserRecipes,
		ttlMs: 1000,
		now: () => time,
	});

	return {
		cache,
		searchUsers,
		loadUserRecipes,
		advance: (ms: number) => {
			time += ms;
		},
	};
}

describe("createLinkLookupCache", () => {
	it("期限内は、同じ問い合わせを、サーバーに聞き直さない", async () => {
		const { cache, searchUsers, advance } = setup();

		await cache.searchUsers("た");
		advance(999);
		await cache.searchUsers("た");

		expect(searchUsers).toHaveBeenCalledTimes(1);

		await cache.searchUsers("は");

		expect(searchUsers).toHaveBeenCalledTimes(2);
	});

	it("期限がきたら、聞き直す", async () => {
		const { cache, loadUserRecipes, advance } = setup();

		await cache.loadUserRecipes("taro");
		advance(1000);
		await cache.loadUserRecipes("taro");

		expect(loadUserRecipes).toHaveBeenCalledTimes(2);
	});

	it("取得中の同じ問い合わせは、1回にまとめる", async () => {
		const { cache, searchUsers } = setup();

		await Promise.all([cache.searchUsers("た"), cache.searchUsers("た")]);

		expect(searchUsers).toHaveBeenCalledTimes(1);
	});

	it("失敗は覚えず、次は聞き直す", async () => {
		const searchUsers = vi
			.fn()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce([]);
		const cache = createLinkLookupCache({
			searchUsers,
			loadUserRecipes: vi.fn(),
		});

		await expect(cache.searchUsers("た")).rejects.toThrow("offline");
		await expect(cache.searchUsers("た")).resolves.toEqual([]);
		expect(searchUsers).toHaveBeenCalledTimes(2);
	});

	it("refresh で、覚えたものをすべて捨てる", async () => {
		const { cache, searchUsers, loadUserRecipes } = setup();

		await cache.searchUsers("た");
		await cache.loadUserRecipes("taro");
		cache.refresh();
		await cache.searchUsers("た");
		await cache.loadUserRecipes("taro");

		expect(searchUsers).toHaveBeenCalledTimes(2);
		expect(loadUserRecipes).toHaveBeenCalledTimes(2);
	});
});
