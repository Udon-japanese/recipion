// メンテ中スイッチ。メンテ中は、同じ名前の Worker を、すべてのリクエストに 503 を返すだけの Worker（worker.ts）に差し替える。
// 解除は、通常のデプロイ（アプリの Worker に戻す）。アプリのコードには手を入れない。

/** メンテ中の Worker にだけ付く変数。通常のデプロイにはない（デプロイ済みの設定から、いまメンテ中かを調べるため）。 */
export const MAINTENANCE_VAR_NAME = "MAINTENANCE_MODE";

type WorkerBinding = { type?: string; name?: string; text?: string };

/** Cloudflare API の「Worker の設定」の応答から、いまメンテ中のコードがデプロイされているかを調べる。 */
export function isMaintenanceActive(settings: {
	bindings?: WorkerBinding[];
}): boolean {
	return (settings.bindings ?? []).some(
		(binding) =>
			binding.type === "plain_text" &&
			binding.name === MAINTENANCE_VAR_NAME &&
			binding.text === "1",
	);
}

const maintenanceHtml = `
<!doctype html>
<html lang="ja">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>メンテナンス中</title>
        <style>
            html {
                background: #fffbea;
                color: #3b3226;
                font-family: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif
            }
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                text-align: center;
                padding: 24px;
                box-sizing: border-box
            }
            main {
                width: 100%;
                max-width: 28rem
            }
            svg {
                display: block;
                width: 100%;
                max-width: 360px;
                height: auto;
                margin: 0 auto 20px;
                overflow: visible
            }
            .m {
                fill: #e9a900
            }
            .i {
                fill: #292720
            }
            .me {
                transform-origin: 112.5px 220px;
                animation: b 3.6s ease-in-out infinite
            }
            @keyframes b {
                50% {
                    transform: scale(1.025, 0.975)
                }
            }
            h1 {
                font-size: 1.4rem;
                margin: 0 0 12px
            }
            p {
                line-height: 1.8;
                margin: 0 0 8px
            }
        </style>
    </head>
    <body>
        <main>
            <svg viewbox="0 100 225 135" aria-hidden="true">
                <g class="me"><path class="m" d="M112.5 130c32.5 0 47.5 35 47.5 62 0 20-15 28-47.5 28S65 212 65 192c0-27 15-62 47.5-62Z"/><rect class="i" x="90" y="155" width="13" height="25" rx="6.5"/><rect class="i" x="122" y="155" width="13" height="25" rx="6.5"/></g>
            </svg>
            <h1>ただいまメンテナンス中です</h1>
            <p>ご不便をおかけします。<br>作業が終わりしだい、また使えるようになります。</p>
            <p>しばらくしてから、もう一度開いてください。</p>
        </main>
    </body>
</html>
`;

/** メンテ中の応答。どのパス・どのメソッドにも同じものを返す（検索エンジンとキャッシュには残さない）。 */
export function createMaintenanceResponse(): Response {
	return new Response(maintenanceHtml, {
		status: 503,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
			"retry-after": "3600",
			"x-robots-tag": "noindex, nofollow",
		},
	});
}
