// API を呼ぶクライアントの種類と、API が受け付ける最も古い版（1か所にまとめる）。
// 古い版を止めるときは、ここを上げてデプロイする（API は 426 を返し、アプリは更新の画面を出す）。
export const clientPlatforms = ["android", "ios", "web"] as const;

export type ClientPlatform = (typeof clientPlatforms)[number];

// 版は「メジャー.マイナー.パッチ」の数字。
export const minimumClientVersions: Record<ClientPlatform, string> = {
	android: "0.0.0",
	ios: "0.0.0",
	web: "0.0.0",
};
