import { createContext, type ReactNode, useContext } from "react";
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

// 辞書を書き換える操作（「もしかして」の統合）。ゲスト・テストは undefined（ボタンを出さない）。
export type IngredientDictionaryActions = {
	mergeNames?: (sourceName: string, targetName: string) => Promise<void>;
};

const IngredientDictionaryActionsContext =
	createContext<IngredientDictionaryActions>({});

export function useIngredientDictionaryActions(): IngredientDictionaryActions {
	return useContext(IngredientDictionaryActionsContext);
}

// 画面（ルート）で、辞書と操作を、まとめて奥へ渡す。
export function IngredientDictionaryScope({
	dictionary,
	mergeNames,
	children,
}: {
	dictionary: IngredientDictionary | undefined;
	mergeNames?: (sourceName: string, targetName: string) => Promise<void>;
	children: ReactNode;
}) {
	return (
		<IngredientDictionaryProvider value={dictionary}>
			<IngredientDictionaryActionsContext.Provider value={{ mergeNames }}>
				{children}
			</IngredientDictionaryActionsContext.Provider>
		</IngredientDictionaryProvider>
	);
}
