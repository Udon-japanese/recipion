// 画面ごとに Lighthouse で計測し、スコアの一覧を表示する（レポートの HTML は lighthouse-reports.local/ に保存）。
// 使い方: `nr lighthouse [ベースURL] [パス...]`
//   nr lighthouse                                  本番（https://recipion.app）の、ログイン不要の画面
//   nr lighthouse http://localhost:4173            `nr preview` で立てたビルド済みのアプリ
//   nr lighthouse https://recipion.app /terms /    パスを指定
// 環境変数 LIGHTHOUSE_RUNS で、1画面あたりの回数を変える（既定 1。中央値のスコアを表示）。
// ログインが必要な画面は、`nr lighthouse:logged-in`（scripts/lighthouse-logged-in.ts）で計測する。
import { launchChrome, measurePages, printRows } from "./lighthouse-core.ts";

const defaultPaths = [
	"/",
	"/login",
	"/terms",
	"/privacy",
	"/shopping",
	"/inventory",
	"/recipes/new",
];

const [baseArg, ...pathArgs] = process.argv.slice(2);
const baseUrl = (baseArg ?? "https://recipion.app").replace(/\/$/, "");
const paths = pathArgs.length > 0 ? pathArgs : defaultPaths;
const runs = Math.max(1, Number(process.env.LIGHTHOUSE_RUNS ?? 1));
const reportDir = "lighthouse-reports.local";

const chrome = await launchChrome();

try {
	const rows = await measurePages({
		port: chrome.port,
		baseUrl,
		paths,
		runs,
		reportDir,
	});

	printRows(`計測先：${baseUrl}（各 ${runs} 回の中央値）`, rows);
	console.log(`\nレポート：${reportDir}/`);
} finally {
	chrome.kill();
}
