import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import type { RecipeEditorDocument } from "../domain/recipe-editor-document";
import type { RecipeVisibility } from "../domain/recipe-link-permission";
import type { RecipeLinkView } from "../domain/recipe-links";
import type { RecipeSnapshot } from "../domain/recipe-snapshot";
import type { PublicRecipeTag } from "../domain/recipe-tags";
import type { PreparedRecipeForStorage } from "./prepare-recipe-for-storage";

// passphraseCipher: 限定公開のパスフレーズ（暗号化したもの）。undefined は、いまのまま。null は、なし（限定公開でなくなる）。
export type CreateRecipeCommand = PreparedRecipeForStorage & {
	passphraseCipher?: string | null;
	// もとにしたレシピ（「このレシピをもとに作る」）と、そのときの親の中身。
	parent?: { recipeId: string; snapshot: RecipeSnapshot };
};

export type CreatedRecipe = {
	id: string;
	publicId: string;
};

export type RecipeSummary = {
	publicId: string;
	name: string;
	yieldText: string;
	visibility: RecipeVisibility;
	// 料理の絵（なければ、レシピ名から選ぶプリセット）。
	cover: DishPlacement[] | null;
	publicTags: PublicRecipeTag[];
	// 自分のレシピの一覧なので、個人用のタグも入る。
	personalTags: string[];
	// 登録した日時（ISO 8601）。
	createdAt: string;
};

export type RecipeDetail = RecipeEditorDocument & {
	publicId: string;
	// 他の人のレシピを見ているときの作者（自分のレシピでは、なし）。
	author?: { name: string; handle: string };
	// 保存されているすべてのリンク（相手が見つからないものを含む。表示用）。編集用の `links` には、相手が見つかるものだけが入る。
	linkViews: RecipeLinkView[];
};

export type UpdateRecipeCommand = PreparedRecipeForStorage & {
	passphraseCipher?: string | null;
	// 親の変更を取り込んで保存するとき、写しを、この（取り込んだ）親の中身にする。undefined は、いまのまま。
	parentSnapshot?: RecipeSnapshot;
};

export type RecipeRepository = {
	create(command: CreateRecipeCommand): Promise<CreatedRecipe>;
	// 内容をすべて置き換える。存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
	// expectedRevision：編集を開いたときの版。いまの版と違えば、書かずに conflict（null は、確かめずに上書き）。
	update(
		publicId: string,
		command: UpdateRecipeCommand,
		expectedRevision: string | null,
	): Promise<
		| { status: "updated"; publicId: string; revision: string }
		| { status: "conflict" }
		| null
	>;
	// 存在しない場合と、他のユーザーのレシピの場合は、どちらも false を返す。
	delete(publicId: string): Promise<boolean>;
	// 存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
	getByPublicId(publicId: string): Promise<RecipeDetail | null>;
	// 編集の画面で使う。内容と、いまの版。
	getForEdit(
		publicId: string,
	): Promise<{ recipe: RecipeDetail; revision: string } | null>;
	list(): Promise<RecipeSummary[]>;
	// 親の変更を取り込まないとき、写しだけを、今の親の中身にする（中身・更新日時・版は変えない）。継承していなければ false。
	replaceParentSnapshot(
		publicId: string,
		snapshot: RecipeSnapshot,
	): Promise<boolean>;
};
