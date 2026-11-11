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
	// 在庫：ない在庫（量が 0・「なし」）を、かくすか。
	inventoryHideEmpty: "inventory-hide-empty",
	// 在庫：リストのまとめ方（zone / expiry / kana）。
	inventoryGroupBy: "inventory-group-by",
	// 在庫：食材ごとに、使った・買い足したときに打った量（チップに出す）。
	inventoryAmountMemory: "inventory-amount-memory",
	// 量の欄：食材ごとに、最後に選んだ重さ・体積の単位（g か kg、ml か L）。買い物メモと在庫で共通。
	measureUnitPreference: "measure-unit-preference",
	// 在庫：冷凍野菜を、生の野菜の代わりに使うか（auto / ask / off）。
	standInMode: "stand-in-mode",
	// 在庫：ロットの換算（1個＝110g など）で引くとき、端数を切り上げるか（up / exact）。
	lotRounding: "lot-rounding",
	// レシピ→買い物メモ：入れる量（usual：いつもの量 / recipe：レシピの量）。
	recipeShoppingAmountMode: "recipe-shopping-amount-mode",
	// 買い物メモ：この端末で、いまログインしている人（オフラインでログイン状態を確かめられないとき、その人のメモを見せる。ログアウトで消す）。
	shoppingSignedInOwner: "shopping-signed-in-owner",
	// 買い物メモ：表示の切り替え（aisle＝売り場順 / store＝店ごと）。
	shoppingView: "shopping-view",
	// レシピの入力：新規登録で、見出しの雛形を最初から入れるか。
	recipeEditorTemplate: "recipe-editor-template",
	// レシピの参照：見ているあいだ、画面を消灯させないか。
	recipeKeepAwake: "recipe-keep-awake",
	// アプリのインストール：ホームの案内のカードを閉じたか（一度閉じたら、もう出さない）。
	installCardDismissed: "install-card-dismissed",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
