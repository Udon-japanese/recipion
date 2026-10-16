// ユーザーに見えるアプリの表示名。
// public/manifest.webmanifest は静的ファイルのためこの定数を参照できない。
// name / short_name を手動で同じ値に揃えること（APP_DISPLAY_NAME と合わせること）。
export const APP_DISPLAY_NAME = "れしぴょん";

// マスコットキャラクターの表示名。名前を変えるときはここだけを直す。
export const MASCOT_DISPLAY_NAME = "れしぽよ";

// ページのタイトル。「ページ名 - アプリ名」の形にする（ページ名を先にすると、タブが狭くても、ページが分かる）。
export function pageTitle(pageName?: string): string {
	return pageName ? `${pageName} - ${APP_DISPLAY_NAME}` : APP_DISPLAY_NAME;
}
