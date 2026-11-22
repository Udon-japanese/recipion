// API を呼ぶクライアントの種類と、API が受け付ける最も古い版（1か所にまとめる）。
// 古い版を止めるときは、ここを上げてデプロイする（API は 426 を返し、アプリは更新の画面を出す）。
export const clientPlatforms = ["android", "ios", "web"] as const;

export type ClientPlatform = (typeof clientPlatforms)[number];

// 版は「メジャー.マイナー.パッチ」の数字。
export const minimumClientVersions: Record<ClientPlatform, string> = {
	android: "0.0.0",
	ios: "0.0.0",
	web: "9.0.0",
};

// 今の Web の画面の版（画面は、API を呼ぶたびに `web/<この版>` を送る）。
// 上げるのは、古い画面では動かなくなる API の変更をしたときだけ（毎回のデプロイでは上げない）。
// そのときは、上の web の最も古い版も、同じ値に上げる（開いたままの古い画面には、読み込み直しを案内する）。
export const webClientVersion = "1.0.0";
