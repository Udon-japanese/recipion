// ビルド時に、静的ファイルとして出力するページ（Cloudflare が、Worker を起動せずに、無料で配信する）。
// 出力は scripts/postbuild-app-shell.ts が行う。ここは、対象の一覧と、検証（画面に依存しない純粋な部分）。

// ログイン状態を含めずに描画させるための、リクエストのヘッダー（ビルドの後処理だけが付ける）。
// サーバーは、このヘッダーがあれば、ログイン状態を「結果なし」（undefined）で返す（誰のセッションも焼き込まない）。
export const STATIC_PAGE_REQUEST_HEADER = "X-Recipion-Static";

// 本文まで描画して、静的ファイルにするページ（ほぼ変わらない文章）。変えたときは、デプロイで更新する。
// mustInclude：その本文に、必ず含まれる文字列（描画に失敗していないことの確認）。
export const renderedStaticPages = [
	{ path: "/terms", mustInclude: "利用規約" },
	{ path: "/privacy", mustInclude: "プライバシーポリシー" },
] as const;

// ブラウザだけで描画する画面（ssr: false）。静的なシェルを、そのパスのファイルとして置く。
// Worker を起動せずに配信され（無料枠を使わない）、オフラインのシェルと同じ仕組みで、画面が描画される。
export const shellCopyPaths = [
	"/shopping",
	"/inventory",
	"/recipes/new",
] as const;

// パス → dist/client からの、出力先（`/terms` → `terms.html`）。
// Cloudflare は、`/terms` を、このファイルで直接配信する（`terms/index.html` だと、`/terms/` への転送が、1回入ってしまう）。
export function staticPageOutputPath(path: string): string {
	return `${path.replace(/^\/+|\/+$/gu, "")}.html`;
}

// 静的なページの HTML に、問題がないか（問題の一覧。なければ空）。
export function findStaticPageProblems(
	html: string,
	mustInclude: string,
): string[] {
	const problems: string[] = [];

	if (!html.includes("<html")) {
		problems.push("HTML ではありません");
	}

	if (!html.includes(mustInclude)) {
		problems.push(`本文が含まれていません（「${mustInclude}」）`);
	}

	if (/initialSession:\s*\{\s*user:/u.test(html)) {
		problems.push("ユーザーのセッション情報が含まれています");
	}

	if (/initialSession:\s*null/u.test(html)) {
		problems.push(
			"initialSession が null です（ログイン済みの人に、ログイン画面が、一瞬見えてしまう。undefined にする必要があります）",
		);
	}

	return problems;
}
