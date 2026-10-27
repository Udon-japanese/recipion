// Lighthouse の計測の共通部分（scripts/lighthouse.ts と scripts/lighthouse-logged-in.ts が使う）。
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

export const categories = [
	"performance",
	"accessibility",
	"best-practices",
	"seo",
];

export type Row = {
	label: string;
	// ログインが必要な画面で、ログイン画面に飛ばされたとき（計測できていない）。
	redirectedTo: string | null;
	scores: Record<string, number>;
};

// Lighthouse は Chrome を使う。Playwright が入れた Chromium を使うので、別に Chrome を入れなくてよい。
export function launchChrome() {
	return launch({
		chromePath: chromium.executablePath(),
		chromeFlags: ["--headless=new", "--no-sandbox"],
	});
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);

	return sorted[Math.floor(sorted.length / 2)];
}

export async function measurePages(options: {
	port: number;
	baseUrl: string;
	paths: readonly string[];
	runs: number;
	reportDir: string;
	// true にすると、計測のたびに、cookie などを消さない（ログイン状態を保つ）。
	keepStorage?: boolean;
}): Promise<Row[]> {
	const { port, baseUrl, paths, runs, reportDir, keepStorage = false } = options;
	const rows: Row[] = [];

	mkdirSync(reportDir, { recursive: true });

	for (const [formFactor, config] of [
		["mobile", undefined],
		["desktop", desktopConfig],
	] as const) {
		for (const path of paths) {
			const perCategory: Record<string, number[]> = {};
			let lastReport = "";
			let redirectedTo: string | null = null;

			for (let i = 0; i < runs; i += 1) {
				const result = await lighthouse(
					`${baseUrl}${path}`,
					{
						port,
						output: "html",
						onlyCategories: categories,
						logLevel: "error",
						disableStorageReset: keepStorage,
					},
					config,
				);

				if (!result) {
					throw new Error(`計測できませんでした：${path}`);
				}

				lastReport = String(result.report);

				const finalPath = new URL(result.lhr.finalDisplayedUrl).pathname;

				if (finalPath !== path && finalPath === "/login") {
					redirectedTo = finalPath;
				}

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
				redirectedTo,
				scores: Object.fromEntries(
					categories.map((category) => [
						category,
						median(perCategory[category]),
					]),
				),
			});
		}
	}

	return rows;
}

export function printRows(title: string, rows: readonly Row[]) {
	console.log(`\n${title}`);
	console.log(
		`${"".padEnd(34)}${categories.map((category) => category.slice(0, 5).padStart(7)).join("")}`,
	);

	for (const { label, scores, redirectedTo } of rows) {
		console.log(
			`${label.padEnd(34)}${categories.map((category) => String(Math.round(scores[category])).padStart(7)).join("")}${redirectedTo ? `  ← ${redirectedTo} に飛ばされました（ログインできていません）` : ""}`,
		);
	}
}
