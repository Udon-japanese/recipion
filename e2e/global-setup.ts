import { execFileSync } from "node:child_process";
import { assertE2eEnvironment } from "./safety";

export default function globalSetup() {
	// 本番・開発用の DB に、e2e を向けない（シードは、確認用ユーザーを消して作り直すため）。
	assertE2eEnvironment();

	// 毎回、同じデータから始める（確認用ユーザーを消して、入れ直す）。
	// シードは、拡張子なしの import があるので、node ではなく tsx で動かす。
	execFileSync(
		"node_modules/.bin/tsx",
		["scripts/seed-demo-account.ts", "--confirm"],
		{ stdio: "inherit", env: process.env },
	);
}
