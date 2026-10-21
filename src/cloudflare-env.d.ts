// `wrangler types` が生成する worker-configuration.d.ts は、ローカルの .env.local にある変数だけを型に含める。
// 本番にだけあるシークレットは、ここで補う（開発では未設定でもよいので、省略可能にする）。
declare namespace Cloudflare {
	interface Env {
		// Cloudflare Turnstile のシークレットキー（`wrangler secret put TURNSTILE_SECRET_KEY`）。
		TURNSTILE_SECRET_KEY?: string;
		// 管理者の画面（/admin）。Cloudflare Access のメールが、この一覧（カンマ区切り）にあるときだけ、動く。
		// いずれも `wrangler secret put` で設定する。未設定のときは、管理者の画面は、使えない。
		ADMIN_EMAILS?: string;
		// 例：https://<チーム名>.cloudflareaccess.com
		CF_ACCESS_TEAM_DOMAIN?: string;
		// Access のアプリケーションの Audience (AUD) タグ。
		CF_ACCESS_AUD?: string;
		// デモ用のアカウント（src/integrations/demo-login）。2つがそろったときだけ有効。不要になったら削除する。
		DEMO_LOGIN_EMAIL?: string;
		DEMO_LOGIN_CODE?: string;
		// Workers AI のバインディング（wrangler.jsonc の `ai`）。公開しようとする文章の審査に使う。
		AI: Ai;
		// 他の人のレシピへのリンクのための検索の回数の制限（wrangler.jsonc の `ratelimits`）。
		LINK_SEARCH_LIMITER: RateLimit;
	}
}
