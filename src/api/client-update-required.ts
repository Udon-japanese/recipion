// API が「この画面の版は古い」（426）と返したことを、画面全体に知らせる。
// 失敗を受け取った処理（裏で動く同期など）が静かに扱っても、読み込み直しの案内は、全体に1つだけ出す。
// 状態は React の外に持つ（どの API の呼び出しからでも知らせられるように）。

let required = false;
const listeners = new Set<() => void>();

function emit(next: boolean) {
	if (required === next) {
		return;
	}

	required = next;

	for (const listener of listeners) {
		listener();
	}
}

export function subscribeClientUpdateRequired(
	listener: () => void,
): () => void {
	listeners.add(listener);

	return () => listeners.delete(listener);
}

export function isClientUpdateRequired(): boolean {
	return required;
}

export function reportClientUpdateRequired(): void {
	emit(true);
}

// 「あとで」で閉じる（次に 426 を受け取ったら、また出す）。
export function dismissClientUpdateRequired(): void {
	emit(false);
}
