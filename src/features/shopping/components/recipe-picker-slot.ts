import type { ReactNode } from "react";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ShoppingBranchSide } from "../domain/shopping-branch";

// 「レシピから入れる」の部品を、買い物メモの画面に差し込むための型。
// レシピの機能（recipes）は、買い物メモ（shopping）を使うので、shopping から recipes を直接読み込まず、
// ルートが部品を渡す（機能同士が、循環して依存しないようにする）。
export type RecipePickerContext = {
	repository: ShoppingRepository;
	// 入れ先。省略は通常のメモ。条件つきのメモの側にも入れられる。
	destination?: { branchId: string; side: ShoppingBranchSide };
	onClose: () => void;
	// 入れたあとに呼ぶ。recipeName は、選んだレシピの名前。
	onApplied: (recipeName: string) => void;
};

export type RenderRecipePicker = (context: RecipePickerContext) => ReactNode;
