// Cloudflare Turnstile（ボット判定）の設定。
// サイトキーは公開してよい値（ブラウザに渡される）。シークレットキーは、Worker のシークレット
// `TURNSTILE_SECRET_KEY` に置き、コードには書かない（auth.ts）。

// 開発用のテストキー（常に成功する。https://developers.cloudflare.com/turnstile/troubleshooting/testing/）。
// テスト用のサイトキーと、テスト用のシークレットキーは、必ず組で使う。
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

// 本番のサイトキー（ホスト名 recipion.app の Turnstile ウィジェット）。
const PRODUCTION_TURNSTILE_SITE_KEY = "0x4AAAAAAFNQiDiaqnjsP5pv";

// 開発中はテストキーを使う。本番でサイトキーが空なら、空文字を返す（画面側で、送信を止める）。
export function getTurnstileSiteKey(isDevelopment: boolean): string {
	return isDevelopment
		? TURNSTILE_TEST_SITE_KEY
		: PRODUCTION_TURNSTILE_SITE_KEY;
}
