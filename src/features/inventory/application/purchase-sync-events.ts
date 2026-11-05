// 端末に貯めた購入を、在庫へ送り始めたことの知らせ（同じ端末の、どのタブで送り始めても届く）。
// 送れなかったときに出した文（「通信が戻ったら、在庫に入れます」など）を、送り始めたら消すために使う
// （送っている間と、その結果は、在庫・買い物メモの上のお知らせが出す）。
// 別のタブへは BroadcastChannel で伝える。送った側のオブジェクトには届かないので、このタブの受け手は、直接呼ぶ。
type Listener = () => void;

export const purchaseSyncChannelName = "recipion:inventory-purchase-sync";

const listeners = new Set<Listener>();
// 使えない環境（古いブラウザ・サーバー）では null。まだ作っていなければ undefined。
let channel: BroadcastChannel | null | undefined;

function notifyListeners(): void {
	for (const listener of listeners) {
		listener();
	}
}

function getChannel(): BroadcastChannel | null {
	if (channel === undefined) {
		channel =
			typeof BroadcastChannel === "undefined"
				? null
				: new BroadcastChannel(purchaseSyncChannelName);

		if (channel) {
			channel.onmessage = notifyListeners;
		}
	}

	return channel;
}

export function subscribePurchaseSyncStarted(listener: Listener): () => void {
	listeners.add(listener);
	// 別のタブからの知らせを受け取れるよう、ここで作っておく。
	getChannel();

	return () => {
		listeners.delete(listener);
	};
}

export function notifyPurchaseSyncStarted(): void {
	notifyListeners();
	getChannel()?.postMessage("started");
}
