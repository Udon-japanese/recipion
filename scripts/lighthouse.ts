// 画面ごとに Lighthouse で計測し、スコアの一覧を表示する（レポートの HTML は lighthouse-reports.local/ に保存）。
// 使い方: `nr lighthouse [ベースURL] [パス...]`
//   nr lighthouse                                  本番（https://recipion.app）の、ログイン不要の画面
//   nr lighthouse http://localhost:4173            `nr preview` で立てたビルド済みのアプリ
//   nr lighthouse https://recipion.app /terms /    パスを指定
// 環境変数 LIGHTHOUSE_RUNS で、1画面あたりの回数を変える（既定 1。中央値のスコアを表示）。
// ログインが必要な画面（在庫・自分のレシピなど）は、ここでは計測しない。
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

const categories = ["performance", "accessibility", "best-practices", "seo"];
const defaultPaths = [
	"/",
	"/login",
	"/terms",
	"/privacy",
	"/shopping",
	"/inventory",
	"/recipes/new",
];
const reportDir = "lighthouse-reports.local";

const [baseArg, ...pathArgs] = process.argv.slice(2);
const baseUrl = (baseArg ?? "https://recipion.app").replace(/\/$/, "");
const paths = pathArgs.length > 0 ? pathArgs : defaultPaths;
const runs = Math.max(1, Number(process.env.LIGHTHOUSE_RUNS ?? 1));

// Lighthouse は Chrome を使う。Playwright が入れた Chromium を使うので、別に Chrome を入れなくてよい。
const chrome = await launch({
	chromePath: chromium.executablePath(),
	chromeFlags: ["--headless=new", "--no-sandbox"],
});

mkdirSync(reportDir, { recursive: true });

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);

	return sorted[Math.floor(sorted.length / 2)];
}

type Row = { label: string; scores: Record<string, number> };
const rows: Row[] = [];

try {
	for (const [formFactor, config] of [
		["mobile", undefined],
		["desktop", desktopConfig],
	] as const) {
		for (const path of paths) {
			const perCategory: Record<string, number[]> = {};
			let lastReport = "";

			for (let i = 0; i < runs; i += 1) {
				const result = await lighthouse(
					`${baseUrl}${path}`,
					{
						port: chrome.port,
						output: "html",
						onlyCategories: categories,
						logLevel: "error",
					},
					config,
				);

				if (!result) {
					throw new Error(`計測できませんでした：${path}`);
				}

				lastReport = String(result.report);

				for (const category of categories) {
					const score = result.lhr.categories[category]?.score;

					(perCategory[category] ??= []).push(
						score === null || score === undefined ? Number.NaN : score * 100,
					);
				}
			}

			const name = `${formFactor}${path.replaceAll("/", "_") || "_"}`;

			writeFileSync(join(reportDir, `${name}.html`), lastReport);
			rows.push({
				label: `${formFactor.padEnd(7)} ${path}`,
				scores: Object.fromEntries(
					categories.map((category) => [category, median(perCategory[category])]),
				),
			});
		}
	}
} finally {
	chrome.kill();
}

console.log(`\n計測先：${baseUrl}（各 ${runs} 回の中央値）`);
console.log(
	`${"".padEnd(26)}${categories.map((category) => category.slice(0, 5).padStart(7)).join("")}`,
);

for (const { label, scores } of rows) {
	console.log(
		`${label.padEnd(26)}${categories.map((category) => String(Math.round(scores[category])).padStart(7)).join("")}`,
	);
}

console.log(`\nレポート：${reportDir}/`);
