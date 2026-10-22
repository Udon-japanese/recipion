// メンテ中にする。理由（任意）を、引数で渡せる: `pnpm run maintenance:on "データベースの作業中です"`
// 理由は、メンテ中の画面に出る（1 行・200 文字まで）。GitHub Actions の Maintenance からも、同じ処理を呼ぶ。
import { execFileSync } from "node:child_process";
import {
	MAINTENANCE_REASON_VAR_NAME,
	normalizeMaintenanceReason,
} from "../src/maintenance/maintenance.ts";

const reason = normalizeMaintenanceReason(process.argv.slice(2).join(" "));
const args = ["exec", "wrangler", "deploy", "-c", "maintenance/wrangler.jsonc"];
if (reason !== null) {
	args.push("--var", `${MAINTENANCE_REASON_VAR_NAME}:${reason}`);
}
console.log(reason === null ? "理由なしでメンテ中にします。" : `理由：${reason}`);
// シェルを通さずに渡す（理由に記号が含まれても、コマンドとして解釈されない）。
execFileSync("pnpm", args, { stdio: "inherit" });
