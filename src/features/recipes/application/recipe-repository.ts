import type { RecipeEditorDocument } from "../domain/recipe-editor-document";
import type { PreparedRecipeForStorage } from "./prepare-recipe-for-storage";

export type CreateRecipeCommand = PreparedRecipeForStorage;

export type CreatedRecipe = {
	id: string;
	publicId: string;
};

export type RecipeSummary = {
	publicId: string;
	name: string;
	servings: number;
};

export type RecipeDetail = RecipeEditorDocument & {
	publicId: string;
};

export type RecipeRepository = {
	create(command: CreateRecipeCommand): Promise<CreatedRecipe>;
	// 存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
	getByPublicId(publicId: string): Promise<RecipeDetail | null>;
	list(): Promise<RecipeSummary[]>;
};
