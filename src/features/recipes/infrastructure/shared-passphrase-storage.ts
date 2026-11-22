import { readPassphraseFromHash } from "../domain/unlisted-share-link";

// 共有リンク（#p=…）で受け取ったパスフレーズを、URL から消して、このタブの sessionStorage に預ける。
// ログインしていない人が、ログインして戻ってくるまで（同じタブ）、持ち越すため。
// sessionStorage が使えない環境（プライベートモードの制限など）では、預けずに、その場でだけ使う。

const keyPrefix = "recipion:shared-passphrase:";

function removeHashFromUrl(): void {
	const { pathname, search } = window.location;

	// TanStack Router の state（history.state）は、そのまま残す。
	window.history.replaceState(window.history.state, "", `${pathname}${search}`);
}

function readStorage(key: string): string | null {
	try {
		return window.sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string | null): void {
	try {
		if (value === null) {
			window.sessionStorage.removeItem(key);
		} else {
			window.sessionStorage.setItem(key, value);
		}
	} catch {
		// 預けられなくても、画面は動く（ログインのあとは、手で入れてもらう）。
	}
}

// URL のフラグメントにパスフレーズがあれば、URL から消して、預ける。あれば、そのパスフレーズを返す。
export function stashSharedPassphrase(publicId: string): string | null {
	const passphrase = readPassphraseFromHash(window.location.hash);

	if (passphrase === null) {
		return null;
	}

	removeHashFromUrl();
	writeStorage(`${keyPrefix}${publicId}`, passphrase);

	return passphrase;
}

// 共有リンクのパスフレーズを、1回だけ取り出す（URL のフラグメント → 預けたもの の順。取り出したら、どちらも消す）。
export function takeSharedPassphrase(publicId: string): string | null {
	const key = `${keyPrefix}${publicId}`;
	const passphrase = stashSharedPassphrase(publicId) ?? readStorage(key);

	writeStorage(key, null);

	return passphrase;
}
