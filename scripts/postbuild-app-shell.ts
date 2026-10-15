// ビルド後に、次のものを作る。
// - オフライン用の静的シェル（dist/client/_shell.html）と、サービスワーカー用のビルド情報（dist/client/sw-build.js）。
// - 静的なページ：規約・ポリシーは、本文まで描画した HTML（dist/client/terms.html など）。
//   ブラウザだけで描画する画面（/shopping など）は、シェルのコピー（dist/client/shopping.html など）。
//   Cloudflare は、これらを、Worker を起動せずに、無料で配信する（静的ファイルへのリクエストは、無料・無制限）。
//   対象の一覧と検証は、src/features/pwa/build/static-pages.ts。ログイン状態は、専用のヘッダー（X-Recipion-Static）で、
//   「結果なし」を返させる（誰のセッションも、ゲストの確定も、焼き込まない）。
//
// シェル: ルートだけを描画した、誰のセッション情報も含まないHTML。
//   TanStack Start は、`X-TSS_SHELL` ヘッダー付きのリクエストにルートだけの描画を返すが、
//   このヘッダーを受け付けるのは `TSS_PRERENDERING` が true のときだけ。
//   アプリは workerd の中で動き、ビルドを実行する Node の環境変数は届かないため、
//   プレビューの Worker に、`dist/server/.dev.vars` 経由で一時的に渡す（終了後に必ず元へ戻す）。
//   本番の Worker には、この変数は渡らない。
//   Workers AI のバインディング（ai）は、プラグインが、常にリモート（Cloudflare 上の本物）で動かす。
//   プレビューを起動すると、Cloudflare との接続が張られ、server.close() のあとも残って、Node のプロセスが終了しない
//   （ビルドのコマンドが、終わらなくなる）。そのため、vite.config.ts で、プレビューのときだけ、
//   プラグインの公式のオプション `remoteBindings: false` を指定している（デプロイされる設定には、影響しない）。
//   （以前は、dist/server/wrangler.json から ai を一時的に消していたが、止めたときに戻らない危険があったので、やめた。）
//   ※ TSS_PRERENDERING と X-TSS_SHELL は TanStack Start の内部実装。更新時は動作を確認すること。
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { preview } from "vite";
import {
	collectPrecacheUrls,
	createBuildId,
	findShellProblems,
	renderBuildScript,
	type ViteManifestEntry,
} from "../src/features/pwa/build/app-shell-manifest.ts";
import {
	findStaticPageProblems,
	renderedStaticPages,
	STATIC_PAGE_REQUEST_HEADER,
	shellCopyPaths,
	staticPageOutputPath,
} from "../src/features/pwa/build/static-pages.ts";

const clientDir = "dist/client";
const devVarsPath = "dist/server/.dev.vars";
const viteManifestPath = `${clientDir}/.vite/manifest.json`;
const shellPath = `${clientDir}/_shell.html`;
const buildScriptPath = `${clientDir}/sw-build.js`;

type GeneratedOutputs = {
	shell: string;
	pages: { path: string; html: string; mustInclude: string }[];
};

async function generateOutputs(): Promise<GeneratedOutputs> {
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
			// X-TSS_SHELL は TanStack Start の内部ヘッダー（シェルとして描画させる）。
			// アプリ側はこれを読まず、自前のヘッダーだけでセッションの焼き込みを避ける。
			headers: {
				"X-TSS_SHELL": "true",
				[STATIC_PAGE_REQUEST_HEADER]: "true",
			},
		});

		if (!response.ok) {
			throw new Error(`シェルの取得に失敗しました: ${response.status}`);
		}

		const shell = await response.text();
		const pages: GeneratedOutputs["pages"] = [];

		for (const page of renderedStaticPages) {
			const pageResponse = await fetch(new URL(page.path, origin), {
				headers: { [STATIC_PAGE_REQUEST_HEADER]: "true" },
			});

			if (!pageResponse.ok) {
				throw new Error(
					`静的ページの取得に失敗しました: ${page.path} ${pageResponse.status}`,
				);
			}

			pages.push({
				path: page.path,
				html: await pageResponse.text(),
				mustInclude: page.mustInclude,
			});
		}

		return { shell, pages };
	} finally {
		await server?.close();

		if (originalDevVars === null) {
			rmSync(devVarsPath, { force: true });
		} else {
			writeFileSync(devVarsPath, originalDevVars);
		}
	}
}

const { shell, pages } = await generateOutputs();
const problems = findShellProblems(shell);

if (problems.length > 0) {
	throw new Error(
		`静的シェルを生成できませんでした:\n- ${problems.join("\n- ")}`,
	);
}

writeFileSync(shellPath, shell);

function writeClientFile(relativePath: string, content: string): void {
	const filePath = `${clientDir}/${relativePath}`;

	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, content);
}

// 本文まで描画した静的ページ。
for (const page of pages) {
	const pageProblems = findStaticPageProblems(page.html, page.mustInclude);

	if (pageProblems.length > 0) {
		throw new Error(
			`静的ページを生成できませんでした（${page.path}）:\n- ${pageProblems.join("\n- ")}`,
		);
	}

	writeClientFile(staticPageOutputPath(page.path), page.html);
}

// ブラウザだけで描画する画面は、シェルのコピーを置く。
for (const path of shellCopyPaths) {
	writeClientFile(staticPageOutputPath(path), shell);
}

const viteManifest = JSON.parse(
	readFileSync(viteManifestPath, "utf8"),
) as Record<string, ViteManifestEntry>;
const urls = collectPrecacheUrls(viteManifest);
const buildId = createBuildId([shell, ...urls]);

writeFileSync(buildScriptPath, renderBuildScript(buildId, urls));

// 一覧の読み取り用で、配信は不要。
rmSync(`${clientDir}/.vite`, { recursive: true, force: true });

console.log(
	`[app-shell] build ${buildId}: shell ${shell.length} bytes, precache ${urls.length} files, static pages ${pages.length} (+ shell copies ${shellCopyPaths.length})`,
);
