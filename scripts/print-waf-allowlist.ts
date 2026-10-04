// Cloudflare の WAF カスタムルールに貼る式を表示する（ダッシュボードで設定する。設定は自動では行わない）。
// 使い方: `nr waf:allowlist`
import { readdirSync, readFileSync } from "node:fs";
import {
	buildWafAllowlist,
	buildWafBlockExpression,
	parseRoutePaths,
} from "../src/config/waf-allowlist.ts";

const routePaths = parseRoutePaths(readFileSync("src/routeTree.gen.ts", "utf8"));
const publicFiles = readdirSync("public", { withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => entry.name);

const allowlist = buildWafAllowlist({ routePaths, publicFiles });

console.log("# WAF カスタムルール（アクション: Block）に貼る式\n");
console.log(buildWafBlockExpression(allowlist));
console.log("\n# 許可しているパス");
console.log("完全一致:", allowlist.exactPaths.join(" "));
console.log("前方一致:", allowlist.prefixes.join(" "));
