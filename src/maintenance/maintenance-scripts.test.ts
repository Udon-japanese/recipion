import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// デプロイ用のスクリプトは、素の Node で動く（#/ の別名や .html の読み込みは、使えない）。
// 読み込みの失敗は、本番のメンテ中にしか気づけないので、ここで実際に動かして確かめる。
function runScript(
	script: string,
	args: string[],
	env: Record<string, string>,
) {
	return spawnSync(process.execPath, [script, ...args], {
		encoding: "utf8",
		env: { ...process.env, ...env },
		timeout: 60_000,
	});
}

describe("メンテ中のスクリプト", () => {
	it("maintenance-status は、認証情報がなければ、案内を出して失敗する（読み込みは成功する）", () => {
		const result = runScript("scripts/maintenance-status.ts", [], {
			CLOUDFLARE_API_TOKEN: "",
			CLOUDFLARE_ACCOUNT_ID: "",
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("CLOUDFLARE_API_TOKEN");
		expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
	});

	it("maintenance-on は、理由つきでも、デプロイの手前（dry-run）まで進む", () => {
		const result = runScript(
			"scripts/maintenance-on.ts",
			["DB作業:", "15時まで"],
			{ MAINTENANCE_DRY_RUN: "1" },
		);

		expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
		expect(result.stdout).toContain("理由：DB作業: 15時まで");
		expect(result.stdout).toContain("MAINTENANCE_REASON");
		expect(result.status).toBe(0);
	}, 60_000);
});
