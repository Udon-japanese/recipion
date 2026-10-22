// メンテ中スイッチのうち、素の Node（デプロイのスクリプト）からも読み込む部分。
// アプリの設定（#/ の別名）や .html の読み込みに依存してはならない（Node では解決できない）。

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
