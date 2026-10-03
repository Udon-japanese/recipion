export type ResolvedIngredient = {
	id: string;
	name: string;
	stockUnitCode: string;
	stockUnitLabel: string;
};

export interface IngredientRepository {
	findByNormalizedAlias(
		normalizedName: string,
	): Promise<ResolvedIngredient | undefined>;
}
