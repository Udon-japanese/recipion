import type { PreparedRecipeForStorage } from "./prepare-recipe-for-storage";

export type CreateRecipeCommand = PreparedRecipeForStorage;

export type CreatedRecipe = {
	id: string;
};

export type RecipeRepository = {
	create(command: CreateRecipeCommand): Promise<CreatedRecipe>;
};
