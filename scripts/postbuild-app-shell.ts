// ビルド後に、サービスワーカー用のビルド情報（dist/client/sw-build.js）を作る。
// オフラインで開く画面は、Vite がビルドした index.html（SPA の入口）そのもの。サービスワーカーが、ビルドごとにキャッシュする。
// Service Worker は、iOS のアプリを出したら消す（docs/todo.md の「移行のコード」）。
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import {
	collectPrecacheUrls,
	createBuildId,
	findShellProblems,
	renderBuildScript,
	type ViteManifestEntry,
} from "../src/features/pwa/build/app-shell-manifest.ts";

const clientDir = "dist/client";
const viteManifestPath = `${clientDir}/.vite/manifest.json`;
const shell = readFileSync(`${clientDir}/index.html`, "utf8");
const problems = findShellProblems(shell);

if (problems.length > 0) {
	throw new Error(
		`オフラインで開く画面（index.html）が正しくありません:\n- ${problems.join("\n- ")}`,
	);
}

const viteManifest = JSON.parse(
	readFileSync(viteManifestPath, "utf8"),
) as Record<string, ViteManifestEntry>;
const urls = collectPrecacheUrls(viteManifest);
// public/sw.js の STATIC_URLS と同じファイル。サービスワーカーが、ビルドごとにキャッシュして、キャッシュを優先して返す。
// 中身をビルド ID に含めないと、manifest だけを変えたとき、ID が変わらず、サービスワーカーが更新されず、
// 端末が古い manifest を返し続ける（2026-11-13 に theme_color を戻したのに、PWA に反映されなかった）。
const staticFileContents = [
	"manifest.webmanifest",
	"recipion-icon.svg",
].map((name) => readFileSync(`${clientDir}/${name}`, "utf8"));
const buildId = createBuildId([shell, ...urls, ...staticFileContents]);

writeFileSync(`${clientDir}/sw-build.js`, renderBuildScript(buildId, urls));

// 一覧の読み取り用で、配信は不要。
rmSync(`${clientDir}/.vite`, { recursive: true, force: true });

console.log(
	`[app-shell] build ${buildId}: index.html ${shell.length} bytes, precache ${urls.length} files`,
);
