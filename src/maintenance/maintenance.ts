// メンテ中スイッチ。メンテ中は、同じ名前の Worker を、すべてのリクエストに 503 を返すだけの Worker（worker.ts）に差し替える。
// 解除は、通常のデプロイ（アプリの Worker に戻す）。アプリのコードには手を入れない。

import { APP_DISPLAY_NAME } from "#/config/app";
// メンテ中の画面（{{APP_NAME}}・{{REASON}} を置き換える）。wrangler は .html を文字列として読み込む。
import maintenancePage from "./maintenance-page.html";

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
			: `\n            <p class="reason">理由：${escapeHtml(reason)}</p>`;
	// 置き換えの文字列に `$` が含まれても、特別な意味にならないよう、関数で渡す。
	return maintenancePage
		.replace("{{APP_NAME}}", () => APP_DISPLAY_NAME)
		.replace("{{REASON}}", () => reasonHtml);
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
