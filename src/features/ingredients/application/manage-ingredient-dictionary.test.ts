import { describe, expect, it, vi } from "vitest";
import { buildDictionaryEntry } from "#/test/builders/build-ingredient-dictionary";
import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";
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
		create: vi.fn(async () => "00000000-0000-4000-8000-000000000099"),
		rename: vi.fn(async () => {}),
		addAlias: vi.fn(async () => {}),
		removeAlias: vi.fn(async () => {}),
		remove: vi.fn(async () => {}),
		setUnmanaged: vi.fn(async () => {}),
		absorb: vi.fn(async () => {}),
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

describe("manageIngredientDictionary（管理しない）", () => {
	it("在庫のある材料は、管理しない材料にできない（ID でも、名前でも）", async () => {
		const repository = createRepository();

		await expect(
			manageIngredientDictionary(
				{ kind: "set-unmanaged", ingredientId: id, unmanaged: true },
				repository,
			),
		).rejects.toThrow(/管理しない材料にできません/u);
		await expect(
			manageIngredientDictionary(
				{ kind: "mark-unmanaged-by-name", name: "タマ" },
				repository,
			),
		).rejects.toThrow(/管理しない材料にできません/u);
		expect(repository.setUnmanaged).not.toHaveBeenCalled();
	});

	it("名前で付けると、辞書にある材料に付け、なければ作ってから付ける", async () => {
		const repository = createRepository();

		await manageIngredientDictionary(
			{ kind: "mark-unmanaged-by-name", name: "マイだし" },
			repository,
		);
		await manageIngredientDictionary(
			{ kind: "mark-unmanaged-by-name", name: "水" },
			repository,
		);

		expect(repository.create).toHaveBeenCalledWith("水");
		expect(repository.setUnmanaged).toHaveBeenNthCalledWith(1, dashi.id, true);
		expect(repository.setUnmanaged).toHaveBeenNthCalledWith(
			2,
			"00000000-0000-4000-8000-000000000099",
			true,
		);
	});

	it("外すのは、在庫があってもよい", async () => {
		const repository = createRepository();

		await manageIngredientDictionary(
			{ kind: "set-unmanaged", ingredientId: id, unmanaged: false },
			repository,
		);

		expect(repository.setUnmanaged).toHaveBeenCalledWith(id, false);
	});
});

describe("manageIngredientDictionary（もしかして：統合）", () => {
	const ownChicken = buildDictionaryEntry({
		id: "00000000-0000-4000-8000-000000000003",
		name: "とりむね",
	});
	const stockedChicken = buildDictionaryEntry({
		id: "00000000-0000-4000-8000-000000000004",
		name: "とりむね",
		hasInventory: true,
	});

	function repositoryWith(entries: IngredientDictionaryEntry[]) {
		const repository = createRepository();

		repository.list = vi.fn(async () => entries);

		return repository;
	}

	it("辞書にない名前は、相手の呼び名にする", async () => {
		const repository = repositoryWith([egg, dashi]);

		await manageIngredientDictionary(
			{ kind: "merge-names", sourceName: "うちのだし", targetName: "マイだし" },
			repository,
		);

		expect(repository.addAlias).toHaveBeenCalledWith(dashi.id, "うちのだし");
	});

	it("相手が辞書になく、カタログの食材なら、作ってから足す", async () => {
		const repository = createRepository();
		const created = buildDictionaryEntry({
			id: "00000000-0000-4000-8000-000000000099",
			name: "鶏むね肉",
		});

		repository.list = vi
			.fn()
			.mockResolvedValueOnce([egg, dashi])
			.mockResolvedValue([egg, dashi, created]);

		await manageIngredientDictionary(
			{ kind: "merge-names", sourceName: "とりむね", targetName: "鶏むね肉" },
			repository,
		);

		expect(repository.create).toHaveBeenCalledWith("鶏むね肉");
		expect(repository.addAlias).toHaveBeenCalledWith(created.id, "とりむね");
	});

	it("入力した名前が在庫のない自分の材料なら、それを相手にまとめる", async () => {
		const repository = repositoryWith([egg, dashi, ownChicken]);

		await manageIngredientDictionary(
			{ kind: "merge-names", sourceName: "とりむね", targetName: "マイだし" },
			repository,
		);

		expect(repository.absorb).toHaveBeenCalledWith(ownChicken.id, dashi.id);
	});

	it.each([
		{
			title: "両方に在庫がある",
			source: stockedChicken,
			target: egg,
			message: /どちらにも在庫/u,
		},
		{
			title: "元にだけ在庫がある（逆向きでまとめるよう知らせる）",
			source: stockedChicken,
			target: dashi,
			message: /「マイだし」を「とりむね」の呼び名に/u,
		},
	])("まとめない：$title", async ({ source, target, message }) => {
		const repository = repositoryWith([source, target]);

		await expect(
			manageIngredientDictionary(
				{
					kind: "merge-names",
					sourceName: source.name,
					targetName: target.name,
				},
				repository,
			),
		).rejects.toThrow(message);
		expect(repository.absorb).not.toHaveBeenCalled();
	});
});
