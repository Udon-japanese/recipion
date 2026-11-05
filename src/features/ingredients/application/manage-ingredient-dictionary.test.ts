import { describe, expect, it, vi } from "vitest";
import { buildDictionaryEntry } from "#/test/builders/build-ingredient-dictionary";
import type { IngredientDictionaryRepository } from "./ingredient-dictionary-repository";
import { manageIngredientDictionary } from "./manage-ingredient-dictionary";

const id = "00000000-0000-4000-8000-000000000001";
const egg = buildDictionaryEntry({
	id,
	name: "卵",
	aliases: ["たまご", "タマ"],
	hasInventory: true,
});
const dashi = buildDictionaryEntry({
	id: "00000000-0000-4000-8000-000000000002",
	name: "マイだし",
});

function createRepository(): IngredientDictionaryRepository {
	return {
		list: vi.fn(async () => [egg, dashi]),
		create: vi.fn(async () => {}),
		rename: vi.fn(async () => {}),
		addAlias: vi.fn(async () => {}),
		removeAlias: vi.fn(async () => {}),
		remove: vi.fn(async () => {}),
	};
}

describe("manageIngredientDictionary（サーバーでの確かめ）", () => {
	it.each([
		{
			title: "ほかの食材の名前を、呼び名にしない",
			command: {
				kind: "add-alias",
				ingredientId: dashi.id,
				alias: "たまご",
			} as const,
			message: /もう使われています/u,
		},
		{
			title: "別のカタログの食材の別名を、呼び名にしない",
			command: {
				kind: "add-alias",
				ingredientId: dashi.id,
				alias: "しょうゆ",
			} as const,
			message: /呼び名にできません/u,
		},
		{
			title: "カタログの別名は消せない",
			command: {
				kind: "remove-alias",
				ingredientId: id,
				alias: "たまご",
			} as const,
			message: /消せません/u,
		},
		{
			title: "在庫のある食材は消せない",
			command: { kind: "remove", ingredientId: id } as const,
			message: /在庫にあるため/u,
		},
	])("$title", async ({ command, message }) => {
		const repository = createRepository();

		await expect(
			manageIngredientDictionary(command, repository),
		).rejects.toThrow(message);
		expect(repository.addAlias).not.toHaveBeenCalled();
		expect(repository.removeAlias).not.toHaveBeenCalled();
		expect(repository.remove).not.toHaveBeenCalled();
	});

	it("問題がなければ書く（自分で足した呼び名を消す・呼び名を足す）", async () => {
		const repository = createRepository();

		await manageIngredientDictionary(
			{ kind: "remove-alias", ingredientId: id, alias: "タマ" },
			repository,
		);
		await manageIngredientDictionary(
			{ kind: "add-alias", ingredientId: dashi.id, alias: "うちのだし" },
			repository,
		);

		expect(repository.removeAlias).toHaveBeenCalledWith(id, "タマ");
		expect(repository.addAlias).toHaveBeenCalledWith(dashi.id, "うちのだし");
	});
});
