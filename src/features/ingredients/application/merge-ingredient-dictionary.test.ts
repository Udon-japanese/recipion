import { describe, expect, it } from "vitest";
import { buildDictionaryEntry } from "#/test/builders/build-ingredient-dictionary";
import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";
import type { IngredientDictionaryRepository } from "./ingredient-dictionary-repository";
import { mergeIngredientDictionary } from "./merge-ingredient-dictionary";

// メモリの上で動く辞書。
function createRepository(initial: IngredientDictionaryEntry[]) {
	let entries = [...initial];
	const repository: IngredientDictionaryRepository = {
		list: async () => entries,
		create: async (name) => {
			entries = [...entries, buildDictionaryEntry({ id: `new-${name}`, name })];

			return `new-${name}`;
		},
		rename: async () => {},
		addAlias: async (id, alias) => {
			entries = entries.map((entry) =>
				entry.id === id
					? { ...entry, aliases: [...entry.aliases, alias] }
					: entry,
			);
		},
		removeAlias: async () => {},
		remove: async () => {},
		setUnmanaged: async (id, unmanaged) => {
			entries = entries.map((entry) =>
				entry.id === id ? { ...entry, unmanaged } : entry,
			);
		},
	};

	return { repository, entries: () => entries };
}

describe("mergeIngredientDictionary", () => {
	it("ない材料は作り、ある材料（呼び名で当たるものも）には足す。消さない", async () => {
		const { repository, entries } = createRepository([
			buildDictionaryEntry({
				id: "dashi",
				name: "マイだし",
				aliases: ["うちのだし"],
			}),
			buildDictionaryEntry({ id: "keep", name: "うちのたれ" }),
		]);

		const result = await mergeIngredientDictionary(
			[
				{ name: "うちのだし", aliases: ["だし汁（家）"], unmanaged: false },
				{ name: "水", aliases: ["お水"], unmanaged: true },
			],
			repository,
		);

		expect(result).toEqual({ created: 1, aliases: 2, skipped: 0 });
		expect(entries()).toEqual([
			expect.objectContaining({
				name: "マイだし",
				aliases: ["うちのだし", "だし汁（家）"],
			}),
			expect.objectContaining({ name: "うちのたれ" }),
			expect.objectContaining({
				name: "水",
				aliases: ["お水"],
				unmanaged: true,
			}),
		]);
	});

	it("ほかの材料と重なる呼び名は飛ばして数え、在庫のある材料には「管理しない」を付けない", async () => {
		const { repository, entries } = createRepository([
			buildDictionaryEntry({ id: "dashi", name: "マイだし" }),
			buildDictionaryEntry({ id: "egg", name: "卵", hasInventory: true }),
		]);

		const result = await mergeIngredientDictionary(
			[{ name: "卵", aliases: ["マイだし", "タマ"], unmanaged: true }],
			repository,
		);

		expect(result).toEqual({ created: 0, aliases: 1, skipped: 1 });
		expect(entries().find((entry) => entry.id === "egg")).toMatchObject({
			aliases: ["タマ"],
			unmanaged: false,
		});
	});

	it("同じファイルを二度入れても、増えない", async () => {
		const { repository, entries } = createRepository([]);
		const file = [{ name: "水", aliases: ["お水"], unmanaged: true }];

		await mergeIngredientDictionary(file, repository);
		const second = await mergeIngredientDictionary(file, repository);

		expect(second).toEqual({ created: 0, aliases: 0, skipped: 0 });
		expect(entries()).toHaveLength(1);
	});
});
