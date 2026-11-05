import { createContext, useContext } from "react";
import type { IngredientDictionary } from "../domain/ingredient-dictionary";

// 画面（ルート）で読み込んだ、自分の食材辞書を、奥の入力欄（材料名の欄・本文・一括追加の補完）へ渡す。
// 渡さない（ゲスト・テスト）ときは undefined で、カタログだけの補完になる。
const IngredientDictionaryContext = createContext<
	IngredientDictionary | undefined
>(undefined);

export const IngredientDictionaryProvider =
	IngredientDictionaryContext.Provider;

export function useIngredientDictionaryContext():
	| IngredientDictionary
	| undefined {
	return useContext(IngredientDictionaryContext);
}
