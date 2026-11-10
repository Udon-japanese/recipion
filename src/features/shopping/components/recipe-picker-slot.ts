import type { ReactNode } from "react";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ShoppingBranchSide } from "../domain/shopping-branch";
import type { ShoppingMemories } from "../domain/shopping-item-memory";

// 「レシピから入れる」の部品を、買い物メモの画面に差し込むための型。
// レシピの機能（recipes）は、買い物メモ（shopping）を使うので、shopping から recipes を直接読み込まず、
// ルートが部品を渡す（機能同士が、循環して依存しないようにする）。
export type RecipePickerContext = {
	repository: ShoppingRepository;
	// 買い物メモの記憶（いつもの量・カテゴリ・換算）を読む。
	loadShoppingMemories?: () => Promise<ShoppingMemories>;
	// 入れ先。省略は通常のメモ。条件つきのメモの側にも入れられる。
	destination?: { branchId: string; side: ShoppingBranchSide };
	// false のあいだは、閉じる動きを見せている途中（省略は true）。
	open?: boolean;
	onClose: () => void;
	// 入れたあとに呼ぶ。recipeName は、選んだレシピの名前。
	onApplied: (recipeName: string) => void;
};

export type RenderRecipePicker = (context: RecipePickerContext) => ReactNode;
