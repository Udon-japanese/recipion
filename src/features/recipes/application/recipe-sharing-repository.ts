import type { RecipeVisibility } from "../domain/recipe-link-permission";

// 公開範囲と、限定公開のパスフレーズ（暗号化したもの）。
export type RecipeSharingState = {
	visibility: RecipeVisibility;
	passphraseCipher: string | null;
};

export type RecipeSharingRepository = {
	// 自分のレシピの、公開の状態。存在しない場合と、他のユーザーのレシピの場合は、どちらも null。
	getSharingState(publicId: string): Promise<RecipeSharingState | null>;
	// 限定公開のパスフレーズを作り直す（これまでに開けた人の記録は、すべて消す）。限定公開でなければ、false。
	replacePassphrase(publicId: string, cipher: string): Promise<boolean>;
};
