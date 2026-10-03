import { describe, expect, it, vi } from "vitest";
import type { IngredientRepository } from "./ingredient-repository";
import { resolveIngredient } from "./resolve-ingredient";

describe("resolveIngredient", () => {
	it("正規化した別名で食材を検索する", async () => {
		const ingredient = {
			id: crypto.randomUUID(),
			name: "卵",
			stockUnitCode: "count",
			stockUnitLabel: "個",
		};
		const repository: IngredientRepository = {
			findByNormalizedAlias: vi.fn().mockResolvedValue(ingredient),
		};

		const result = await resolveIngredient("  ＴＡＭＡＧＯ  ", repository);

		expect(repository.findByNormalizedAlias).toHaveBeenCalledWith("tamago");
		expect(result).toEqual(ingredient);
	});

	it("一致する別名がなければundefinedを返す", async () => {
		const repository: IngredientRepository = {
			findByNormalizedAlias: vi.fn().mockResolvedValue(undefined),
		};

		await expect(
			resolveIngredient("未知の食材", repository),
		).resolves.toBeUndefined();
	});

	it("空の食材名ではRepositoryを呼ばない", async () => {
		const repository: IngredientRepository = {
			findByNormalizedAlias: vi.fn(),
		};

		await expect(resolveIngredient("　 ", repository)).rejects.toThrow(
			"食材名を入力してください",
		);

		expect(repository.findByNormalizedAlias).not.toHaveBeenCalled();
	});
});
