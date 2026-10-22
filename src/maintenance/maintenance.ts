// メンテ中スイッチ。メンテ中は、同じ名前の Worker を、すべてのリクエストに 503 を返すだけの Worker（worker.ts）に差し替える。
// 解除は、通常のデプロイ（アプリの Worker に戻す）。アプリのコードには手を入れない。

import { APP_DISPLAY_NAME } from "#/config/app";
import {
	isMaintenanceActive,
	MAINTENANCE_REASON_VAR_NAME,
	MAINTENANCE_VAR_NAME,
	normalizeMaintenanceReason,
} from "./maintenance-config";
// メンテ中の画面（{{APP_NAME}}・{{REASON}} を置き換える）。wrangler は .html を文字列として読み込む。
import maintenancePage from "./maintenance-page.html";

// テストと worker.ts が、ここから読み込めるようにする。
export {
	isMaintenanceActive,
	MAINTENANCE_REASON_VAR_NAME,
	MAINTENANCE_VAR_NAME,
	normalizeMaintenanceReason,
};

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
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
