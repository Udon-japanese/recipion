// 引っ張り更新が終わったことを、画面の部品に知らせる（window のイベント）。
// 在庫の一覧は、ルートの loader ではなく部品の中で読むため、ルートの再読み込みでは取り直せない。
const REFRESH_REQUEST_EVENT = "recipion:refresh-request";

export function requestAppRefresh(): void {
	window.dispatchEvent(new Event(REFRESH_REQUEST_EVENT));
}

// 戻り値は、購読を止める関数（useEffect の後始末に使う）。
export function onAppRefreshRequest(listener: () => void): () => void {
	window.addEventListener(REFRESH_REQUEST_EVENT, listener);

	return () => window.removeEventListener(REFRESH_REQUEST_EVENT, listener);
}
