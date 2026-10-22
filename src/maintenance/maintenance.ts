// メンテ中スイッチ。メンテ中は、同じ名前の Worker を、すべてのリクエストに 503 を返すだけの Worker（worker.ts）に差し替える。
// 解除は、通常のデプロイ（アプリの Worker に戻す）。アプリのコードには手を入れない。

/** メンテ中の Worker にだけ付く変数。通常のデプロイにはない（デプロイ済みの設定から、いまメンテ中かを調べるため）。 */
export const MAINTENANCE_VAR_NAME = "MAINTENANCE_MODE";

/** メンテ中の画面に出す理由（任意）。メンテ中にするときに、デプロイの変数として渡す。 */
export const MAINTENANCE_REASON_VAR_NAME = "MAINTENANCE_REASON";

const MAX_REASON_LENGTH = 200;

/** 理由を、1 行・200 文字までに整える。空なら null（理由は出さない）。 */
export function normalizeMaintenanceReason(
	raw: string | null | undefined,
): string | null {
	const oneLine = (raw ?? "").replace(/\s+/gu, " ").trim();
	if (oneLine === "") return null;
	return Array.from(oneLine).slice(0, MAX_REASON_LENGTH).join("");
}

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

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

function renderMaintenanceHtml(reason: string | null): string {
	const reasonHtml =
		reason === null
			? ""
			: `
            <p class="reason">理由：${escapeHtml(reason)}</p>`;
	return `
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
            .reason {
                background: #fff;
                border-radius: 8px;
                padding: 8px 12px;
                margin: 16px 0 8px
            }
            @media (prefers-reduced-motion: reduce) { .me { animation: none } }
        </style>
    </head>
    <body>
        <main>
            <svg viewbox="0 100 225 135" aria-hidden="true">
                <g class="me"><path class="m" d="M112.5 130c32.5 0 47.5 35 47.5 62 0 20-15 28-47.5 28S65 212 65 192c0-27 15-62 47.5-62Z"/><rect class="i" x="90" y="155" width="13" height="25" rx="6.5"/><rect class="i" x="122" y="155" width="13" height="25" rx="6.5"/></g>
            </svg>
            <h1>ただいまメンテナンス中です</h1>
            <p>ご不便をおかけします。<br>作業が終わりしだい、また使えるようになります。</p>${reasonHtml}
            <p>しばらくしてから、もう一度開いてください。</p>
        </main>
    </body>
</html>
`;
}

/** メンテ中の応答。どのパス・どのメソッドにも同じものを返す（検索エンジンとキャッシュには残さない）。 */
export function createMaintenanceResponse(
	reason: string | null | undefined = null,
): Response {
	return new Response(
		renderMaintenanceHtml(normalizeMaintenanceReason(reason)),
		{
			status: 503,
			headers: {
				"content-type": "text/html; charset=utf-8",
				"cache-control": "no-store",
				"retry-after": "3600",
				"x-robots-tag": "noindex, nofollow",
			},
		},
	);
}
