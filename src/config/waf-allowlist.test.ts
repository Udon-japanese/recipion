import { describe, expect, it } from "vitest";
import {
	buildWafAllowlist,
	buildWafBlockExpression,
	parseRoutePaths,
} from "./waf-allowlist";

const routeTreeSource = `
export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/shopping': typeof ShoppingRoute
  '/recipes/': typeof RecipesIndexRoute
  '/recipes/new': typeof RecipesNewRoute
  '/recipes/$publicId': typeof RecipesPublicIdIndexRoute
  '/recipes/$publicId/edit': typeof RecipesPublicIdEditRoute
  '/api/auth/$': typeof ApiAuthSplatRoute
}
export interface FileRoutesByTo {
  '/ignored': typeof X
}
`;

describe("parseRoutePaths", () => {
	it("FileRoutesByFullPath のフルパスだけを取り出す", () => {
		expect(parseRoutePaths(routeTreeSource)).toEqual([
			"/",
			"/shopping",
			"/recipes/",
			"/recipes/new",
			"/recipes/$publicId",
			"/recipes/$publicId/edit",
			"/api/auth/$",
		]);
	});

	it("ルート定義がなければ、エラーにする", () => {
		expect(() => parseRoutePaths("export const x = 1")).toThrow(
			"FileRoutesByFullPath",
		);
	});
});

describe("buildWafAllowlist", () => {
	const allowlist = buildWafAllowlist({
		routePaths: parseRoutePaths(routeTreeSource),
		publicFiles: ["manifest.webmanifest", "robots.txt"],
	});

	it("動的なルートは前方一致、静的なルートと公開ファイルは完全一致にする", () => {
		expect(allowlist.prefixes).toEqual([
			"/_serverFn/",
			"/api/auth/",
			"/assets/",
			"/cdn-cgi/",
			"/recipes/",
		]);
		expect(allowlist.exactPaths).toEqual([
			"/",
			"/_shell",
			"/_shell.html",
			"/manifest.webmanifest",
			"/recipes",
			"/robots.txt",
			"/shopping",
			"/sw-build.js",
		]);
	});

	it("前方一致で足りる完全一致は、重複させない（/recipes/new は /recipes/ に含まれる）", () => {
		expect(allowlist.exactPaths).not.toContain("/recipes/new");
		expect(allowlist.exactPaths).not.toContain("/recipes/");
	});

	it("開発中だけの確認用の画面（/dev 以下）は、許可しない", () => {
		const withDev = buildWafAllowlist({
			routePaths: ["/", "/dev/ui", "/dev"],
			publicFiles: [],
		});

		expect(withDev.exactPaths).not.toContain("/dev/ui");
		expect(withDev.exactPaths).not.toContain("/dev");
	});
});

describe("buildWafBlockExpression", () => {
	it("許可リスト以外を遮断する式を作る", () => {
		expect(
			buildWafBlockExpression({
				exactPaths: ["/", "/shopping"],
				prefixes: ["/assets/", "/recipes/"],
			}),
		).toBe(
			'not (http.request.uri.path in {"/" "/shopping"} or starts_with(http.request.uri.path, "/assets/") or starts_with(http.request.uri.path, "/recipes/"))',
		);
	});
});
