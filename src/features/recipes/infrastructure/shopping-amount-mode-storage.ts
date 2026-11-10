import { storageKeys } from "#/local-storage/keys";
import { enumStorageItem } from "#/local-storage/storage-item";
import {
	type ShoppingAmountMode,
	shoppingAmountModes,
} from "../domain/plan-shopping-from-recipe";

// レシピから買い物メモに入れる量（この端末だけに保存する）。初期値は、いつもの量（覚えていない食材は、レシピの量）。
export const shoppingAmountModeItem = enumStorageItem<ShoppingAmountMode>({
	key: storageKeys.recipeShoppingAmountMode,
	values: shoppingAmountModes,
	defaultValue: "usual",
});
