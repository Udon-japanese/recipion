import type { RecipeEditorDocument } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";
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
	// 保存されているすべてのリンク（相手が見つからないものを含む。表示用）。編集用の `links` には、相手が見つかるものだけが入る。
	linkViews: RecipeLinkView[];
};

export type UpdateRecipeCommand = PreparedRecipeForStorage;

export type RecipeRepository = {
	create(command: CreateRecipeCommand): Promise<CreatedRecipe>;
	// 内容をすべて置き換える。存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
	update(
		publicId: string,
		command: UpdateRecipeCommand,
	): Promise<{ publicId: string } | null>;
	// 存在しない場合と、他のユーザーのレシピの場合は、どちらも false を返す。
	delete(publicId: string): Promise<boolean>;
	// 存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
	getByPublicId(publicId: string): Promise<RecipeDetail | null>;
	list(): Promise<RecipeSummary[]>;
};
