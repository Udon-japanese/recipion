import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const required = [
	"DATABASE_URL",
	"BETTER_AUTH_URL",
	"BETTER_AUTH_SECRET",
	"DEMO_LOGIN_EMAIL",
	"DEMO_LOGIN_CODE",
] as const;

// 接続文字列の接続先（ホスト名）。Neon は、ブランチごとにホスト名が違う。パスワードは見ない。
function databaseHost(connectionString: string | undefined): string | null {
	if (!connectionString) {
		return null;
	}

	try {
		// pooler の有無で別のホストに見えないよう、"-pooler" を除く。
		return new URL(connectionString).hostname.replace("-pooler", "");
	} catch {
		return null;
	}
}

function readDatabaseHost(path: string): string | null {
	try {
		return databaseHost(parseEnv(readFileSync(path, "utf8")).DATABASE_URL);
	} catch {
		return null;
	}
}

export default function globalSetup() {
	const missing = required.filter((name) => !process.env[name]);

	if (missing.length > 0) {
		throw new Error(
			`e2e の環境変数が足りません：${missing.join(", ")}。e2e/env.example を .env.e2e.local にコピーして、値を入れてください。`,
		);
	}

	// ---- 安全ガード：本番・開発用の DB に、e2e を向けない（シードは、確認用ユーザーを消して作り直すため）----
	const e2eHost = databaseHost(process.env.DATABASE_URL);

	if (!e2eHost) {
		throw new Error("DATABASE_URL を読み取れません。");
	}

	for (const [label, path] of [
		["本番", ".env.prod-db.local"],
		["開発", ".env.local"],
	] as const) {
		if (readDatabaseHost(path) === e2eHost) {
			throw new Error(
				`DATABASE_URL が、${label}の DB（${path}）と同じ接続先です。e2e 専用の Neon ブランチを指定してください。`,
			);
		}
	}

	if (new URL(process.env.BETTER_AUTH_URL as string).hostname !== "localhost") {
		throw new Error("BETTER_AUTH_URL は、localhost のアプリにしてください。");
	}

	if (
		(process.env.ADMIN_EMAILS ?? "")
			.toLowerCase()
			.split(",")
			.map((email) => email.trim())
			.includes((process.env.DEMO_LOGIN_EMAIL as string).toLowerCase())
	) {
		throw new Error("DEMO_LOGIN_EMAIL に、管理者のメールは使えません。");
	}

	// 毎回、同じデータから始める（確認用ユーザーを消して、入れ直す）。
	// シードは、拡張子なしの import があるので、node ではなく tsx で動かす。
	execFileSync(
		"node_modules/.bin/tsx",
		["scripts/seed-demo-account.ts", "--confirm"],
		{ stdio: "inherit", env: process.env },
	);
}
