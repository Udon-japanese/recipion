// ビルド後に、オフライン用の静的シェル（dist/client/_shell.html）と、
// サービスワーカー用のビルド情報（dist/client/sw-build.js）を作る。
//
// シェル: ルートだけを描画した、誰のセッション情報も含まないHTML。
//   TanStack Start は、`X-TSS_SHELL` ヘッダー付きのリクエストにルートだけの描画を返すが、
//   このヘッダーを受け付けるのは `TSS_PRERENDERING` が true のときだけ。
//   アプリは workerd の中で動き、ビルドを実行する Node の環境変数は届かないため、
//   プレビューの Worker に、`dist/server/.dev.vars` 経由で一時的に渡す（終了後に必ず元へ戻す）。
//   本番の Worker には、この変数は渡らない。
//   ※ TSS_PRERENDERING と X-TSS_SHELL は TanStack Start の内部実装。更新時は動作を確認すること。
import {
	existsSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { preview } from "vite";
import {
	collectPrecacheUrls,
	createBuildId,
	findShellProblems,
	renderBuildScript,
	type ViteManifestEntry,
} from "../src/features/pwa/build/app-shell-manifest.ts";

const clientDir = "dist/client";
const devVarsPath = "dist/server/.dev.vars";
const viteManifestPath = `${clientDir}/.vite/manifest.json`;
const shellPath = `${clientDir}/_shell.html`;
const buildScriptPath = `${clientDir}/sw-build.js`;

async function generateShell(): Promise<string> {
	const originalDevVars = existsSync(devVarsPath)
		? readFileSync(devVarsPath, "utf8")
		: null;

	writeFileSync(
		devVarsPath,
		`${originalDevVars ?? ""}\nTSS_PRERENDERING=true\n`,
	);

	let server: Awaited<ReturnType<typeof preview>> | undefined;

	try {
		server = await preview({ preview: { port: 0, open: false } });

		const origin = server.resolvedUrls?.local[0];

		if (!origin) {
			throw new Error("プレビューサーバーの URL を取得できませんでした");
		}

		const response = await fetch(new URL("/", origin), {
			headers: { "X-TSS_SHELL": "true" },
		});

		if (!response.ok) {
			throw new Error(`シェルの取得に失敗しました: ${response.status}`);
		}

		return await response.text();
	} finally {
		await server?.close();

		if (originalDevVars === null) {
			rmSync(devVarsPath, { force: true });
		} else {
			writeFileSync(devVarsPath, originalDevVars);
		}
	}
}

const shell = await generateShell();
const problems = findShellProblems(shell);

if (problems.length > 0) {
	throw new Error(
		`静的シェルを生成できませんでした:\n- ${problems.join("\n- ")}`,
	);
}

writeFileSync(shellPath, shell);

const viteManifest = JSON.parse(
	readFileSync(viteManifestPath, "utf8"),
) as Record<string, ViteManifestEntry>;
const urls = collectPrecacheUrls(viteManifest);
const buildId = createBuildId([shell, ...urls]);

writeFileSync(buildScriptPath, renderBuildScript(buildId, urls));

// 一覧の読み取り用で、配信は不要。
rmSync(`${clientDir}/.vite`, { recursive: true, force: true });

console.log(
	`[app-shell] build ${buildId}: shell ${shell.length} bytes, precache ${urls.length} files`,
);
