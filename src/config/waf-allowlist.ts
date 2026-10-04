// Cloudflare の WAF カスタムルール（アクションは Block）に貼る式を作る。
// このアプリが提供するパスだけを許可し、それ以外（/wp-login.php、/.env など、bot のスキャン）は、
// Worker を起動する前に、ゾーンで遮断する。Worker の起動、SSR、DB への接続を、避けられる。
//
// 許可するパスは、ルート定義（routeTree.gen.ts）と public/ のファイルから作る。
// ルートや公開ファイルを足したら、`nr waf:allowlist` で式を作り直して、ダッシュボードのルールを更新すること。

// routeTree.gen.ts の `FileRoutesByFullPath` に並ぶ、フルパスを取り出す。
export function parseRoutePaths(routeTreeSource: string): string[] {
	const block = routeTreeSource.match(
		/export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/u,
	);

	if (!block) {
		throw new Error(
			"routeTree.gen.ts に FileRoutesByFullPath が見つかりません",
		);
	}

	return [...block[1].matchAll(/^\s*'([^']+)':/gmu)].map((match) => match[1]);
}

export type WafAllowlist = {
	exactPaths: string[];
	prefixes: string[];
};

// アプリの内部で、ルート定義や public/ には現れないが、配信するパス。
const internalExactPaths = ["/sw-build.js", "/_shell", "/_shell.html"];
// `/cdn-cgi/` は、Cloudflare 自身が使う（チャレンジ、Turnstile など）。遮断すると、これらが壊れる。
const internalPrefixes = ["/assets/", "/_serverFn/", "/cdn-cgi/"];

export function buildWafAllowlist(input: {
	routePaths: readonly string[];
	publicFiles: readonly string[];
}): WafAllowlist {
	const exactPaths = new Set<string>(internalExactPaths);
	const prefixes = new Set<string>(internalPrefixes);

	for (const routePath of input.routePaths) {
		const dynamicIndex = routePath.indexOf("$");

		if (dynamicIndex === -1) {
			// 末尾の `/` の有無は、どちらも許可する（`/recipes/` と `/recipes`）。
			exactPaths.add(routePath);
			exactPaths.add(
				routePath.length > 1 ? routePath.replace(/\/$/u, "") : routePath,
			);
			continue;
		}

		// `$param` や `$`（splat）を含むルートは、その手前までを、前方一致で許可する。
		prefixes.add(routePath.slice(0, dynamicIndex));
	}

	for (const file of input.publicFiles) {
		exactPaths.add(`/${file}`);
	}

	// 前方一致で足りるパスの、完全一致は、重複するので除く。
	const prefixList = [...prefixes].sort();
	const exact = [...exactPaths]
		.filter((path) => !prefixList.some((prefix) => path.startsWith(prefix)))
		.sort();

	return { exactPaths: exact, prefixes: prefixList };
}

export function buildWafBlockExpression(allowlist: WafAllowlist): string {
	const exactSet = allowlist.exactPaths.map((path) => `"${path}"`).join(" ");
	const prefixConditions = allowlist.prefixes.map(
		(prefix) => `starts_with(http.request.uri.path, "${prefix}")`,
	);

	return `not (${[`http.request.uri.path in {${exactSet}}`, ...prefixConditions].join(" or ")})`;
}
