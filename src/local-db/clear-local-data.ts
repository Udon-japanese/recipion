import { storageKeyPrefix } from "#/local-storage/storage-item";
import { getLocalDatabase } from "./database";

// このサービスが localStorage に保存した設定を消す（キーの先頭が recipion: のもの）。
export function clearAppLocalStorage(
	storage: Pick<Storage, "length" | "key" | "removeItem">,
): void {
	const keys: string[] = [];

	for (let index = 0; index < storage.length; index += 1) {
		const key = storage.key(index);

		if (key?.startsWith(storageKeyPrefix)) {
			keys.push(key);
		}
	}

	for (const key of keys) {
		storage.removeItem(key);
	}
}

// 端末に保存した情報（買い物メモ、在庫の控え、設定）を消す。アカウントの削除のあとに呼ぶ。
export async function clearLocalData(): Promise<void> {
	try {
		clearAppLocalStorage(window.localStorage);
	} catch {
		// localStorage が使えない環境では、何もしない。
	}

	try {
		await getLocalDatabase().delete();
	} catch {
		// 削除できなくても、画面は先に進める。
	}
}
