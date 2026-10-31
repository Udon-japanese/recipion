// localStorage に保存する項目の、キーの登録簿（1か所で管理する。名前の衝突を防ぐ）。
// 実際の保存名は、先頭に `recipion:` が付く（storage-item.ts）。
//
// 【保存する項目を足すとき】
// 1. ここにキーを足す（機能の名前を入れる）。
// 2. その機能の側で、defineStorageItem / jsonStorageItem で、項目を定義する（型・既定値・検証）。
// 3. 形式を変えるときは、既存のキーを書き換えず、新しいキーにする（古い値は、使われずに残るだけ。退会時に、まとめて消える）。

export const storageKeys = {
	// 在庫：期限の目安の設定（off / reliable / all）。
	expiryEstimateLevel: "expiry-estimate-level",
	// 在庫：過去に入力した期限から覚えた、日数の目安。
	expiryHints: "expiry-hints",
	// 在庫：表示の切り替え（list＝リスト / scene＝おうち）。
	inventoryView: "inventory-view",
	// 在庫：おうちの表示で、れしぽよを出すか。
	inventoryPet: "inventory-pet",
	// 在庫：リストのまとめ方（zone / expiry / kana）。
	inventoryGroupBy: "inventory-group-by",
	// 在庫：この端末で、最後に、ログイン前の購入を片づけたユーザー。
	inventoryLastOwner: "inventory-last-owner",
	// 買い物メモ：表示の切り替え（aisle＝売り場順 / store＝店ごと）。
	shoppingView: "shopping-view",
	// レシピの入力：新規登録で、見出しの雛形を最初から入れるか。
	recipeEditorTemplate: "recipe-editor-template",
	// レシピの参照：見ているあいだ、画面を消灯させないか。
	recipeKeepAwake: "recipe-keep-awake",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
