import { normalizeIngredientName } from "../domain/normalize-ingredient-name";
import type { IngredientRepository } from "./ingredient-repository";

export async function resolveIngredient(
	name: string,
	repository: IngredientRepository,
) {
	const normalizedName = normalizeIngredientName(name);

	return repository.findByNormalizedAlias(normalizedName);
}
