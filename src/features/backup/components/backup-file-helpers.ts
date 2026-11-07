// 書き出し・読み込みの画面（在庫とレシピ、買い物メモ）で共通の小さな処理。

// 書き出したファイルを、端末に保存する（ダウンロード）。
export function saveFileWithDownload(fileName: string, contents: string): void {
	const url = URL.createObjectURL(
		new Blob([contents], { type: "application/json" }),
	);
	const anchor = document.createElement("a");

	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	// クリックの処理が終わってから、URL を捨てる。
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function formatCount(count: number): string {
	return count.toLocaleString("ja-JP");
}

// 書き出した日時（日本時間）。
export function formatBackupDate(value: string): string {
	return new Intl.DateTimeFormat("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}
