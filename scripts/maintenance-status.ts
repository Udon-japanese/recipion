// いまメンテ中のコードが本番にデプロイされているかを、Cloudflare の API で調べる（自動デプロイが、メンテ中を終わらせないため）。
// 終了コード: 0 = メンテ中ではない / 10 = メンテ中 / 1 = 調べられなかった
// 環境変数: CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID
import { isMaintenanceActive } from "../src/maintenance/maintenance.ts";

const WORKER_NAME = "recipion";
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) {
	console.error("CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID が必要です。");
	process.exit(1);
}

const response = await fetch(
	`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${WORKER_NAME}/settings`,
	{ headers: { authorization: `Bearer ${token}` } },
);
if (!response.ok) {
	console.error(`Worker の設定を取得できませんでした（${response.status}）。`);
	process.exit(1);
}
const body = (await response.json()) as { result?: { bindings?: never[] } };
if (!body.result) {
	console.error("Worker の設定の形式が想定と違います。");
	process.exit(1);
}
if (isMaintenanceActive(body.result)) {
	console.log("メンテ中です。");
	process.exit(10);
}
console.log("メンテ中ではありません。");
