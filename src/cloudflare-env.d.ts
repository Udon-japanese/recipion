// `wrangler types` が生成する worker-configuration.d.ts は、ローカルの .env.local にある変数だけを型に含める。
// 本番にだけあるシークレットは、ここで補う（開発では未設定でもよいので、省略可能にする）。
declare namespace Cloudflare {
	interface Env {
		// Cloudflare Turnstile のシークレットキー（`wrangler secret put TURNSTILE_SECRET_KEY`）。
		TURNSTILE_SECRET_KEY?: string;
	}
}
