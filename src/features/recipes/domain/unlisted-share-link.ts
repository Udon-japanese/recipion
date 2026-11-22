// 限定公開のレシピを共有するリンク。パスフレーズは、URL のフラグメント（#p=…）に入れる。
// フラグメントは、サーバーへのリクエストにも、Referer にも入らない（アクセスのログに残らない）。
// 開いた側は、読んだらすぐに URL から消す（shared-passphrase-storage.ts）。

import { passphraseCharacterClass } from "./passphrase-words";

const passphraseKey = "p";

export function buildUnlistedShareUrl(
	origin: string,
	publicId: string,
	passphrase: string,
): string {
	const fragment = new URLSearchParams({ [passphraseKey]: passphrase });

	return `${origin}/recipes/${encodeURIComponent(publicId)}#${fragment.toString()}`;
}

// 共有のときに添える文（リンクが開けないときのために、パスフレーズも書く）。
export function buildUnlistedShareText(
	recipeName: string,
	passphrase: string,
): string {
	return `レシピ「${recipeName}」（限定公開）\nパスフレーズ：${passphrase}`;
}

// パスフレーズの部分（先頭から、語に使う文字が続くところまで）。
const leadingPassphrasePattern = new RegExp(
	`^${passphraseCharacterClass}+`,
	"u",
);

// location.hash（「#p=…」）から、パスフレーズを読む。なければ null。
// 先頭から、ひらがなが続くところまでだけを使う。リンクと、添えた文をまとめてアドレスバーに貼ると、
// Chrome は改行を詰めて、文をフラグメントの続きにする（「…さけレシピ「…」」。Mac の Chrome で確認）。
export function readPassphraseFromHash(hash: string): string | null {
	const value = new URLSearchParams(hash.replace(/^#/u, ""))
		.get(passphraseKey)
		?.trim()
		.match(leadingPassphrasePattern)?.[0];

	return value ?? null;
}
