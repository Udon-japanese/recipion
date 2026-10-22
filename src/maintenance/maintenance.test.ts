import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { APP_DISPLAY_NAME } from "#/config/app";
import {
	createMaintenanceResponse,
	isMaintenanceActive,
	MAINTENANCE_VAR_NAME,
	normalizeMaintenanceReason,
} from "./maintenance";

function readJsonc(path: string): Record<string, unknown> {
	const text = readFileSync(path, "utf8");
	return ts.parseConfigFileTextToJson(path, text).config;
}

describe("メンテ中の応答", () => {
	it("503 で、キャッシュと検索エンジンに残さない", async () => {
		const response = createMaintenanceResponse();
		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(response.headers.get("x-robots-tag")).toContain("noindex");
		expect(response.headers.get("retry-after")).not.toBeNull();
		expect(await response.text()).toContain("メンテナンス中");
	});
});

describe("メンテ中の画面", () => {
	it("アプリ名が入り、置き換えの印は残らない", async () => {
		const html = await createMaintenanceResponse("作業中").text();

		expect(html).toContain(
			`<title>メンテナンス中 - ${APP_DISPLAY_NAME}</title>`,
		);
		expect(html).not.toContain("{{");
	});

	it("理由に `$&` などが含まれても、そのまま出る", async () => {
		const html = await createMaintenanceResponse("$& $1 $$").text();

		expect(html).toContain("理由：$&amp; $1 $$");
	});
});

describe("メンテ中の理由", () => {
	it("1 行・200 文字までに整える。空なら、出さない", () => {
		expect(normalizeMaintenanceReason("  作業中\n\nです  ")).toBe(
			"作業中 です",
		);
		expect(normalizeMaintenanceReason("   ")).toBeNull();
		expect(normalizeMaintenanceReason(undefined)).toBeNull();
		expect(
			Array.from(normalizeMaintenanceReason("あ".repeat(500)) ?? ""),
		).toHaveLength(200);
	});

	it("画面に出す。HTML として解釈されないよう、記号は無害にする", async () => {
		const html = await createMaintenanceResponse(
			'<script>alert("x")</script> & 作業中',
		).text();
		expect(html).toContain("理由：");
		expect(html).toContain("&lt;script&gt;");
		expect(html).toContain("&amp; 作業中");
		expect(html).not.toContain("<script>");
	});

	it("理由がなければ、理由の欄を出さない", async () => {
		expect(await createMaintenanceResponse().text()).not.toContain("理由：");
	});
});

describe("いまメンテ中かの判定", () => {
	it("メンテ中の変数があるときだけ、メンテ中", () => {
		const binding = {
			type: "plain_text",
			name: MAINTENANCE_VAR_NAME,
			text: "1",
		};
		expect(isMaintenanceActive({ bindings: [binding] })).toBe(true);
		expect(isMaintenanceActive({ bindings: [] })).toBe(false);
		expect(isMaintenanceActive({})).toBe(false);
		expect(isMaintenanceActive({ bindings: [{ ...binding, text: "0" }] })).toBe(
			false,
		);
	});
});

describe("メンテ中の Worker の設定", () => {
	const app = readJsonc("wrangler.jsonc");
	const maintenance = readJsonc("maintenance/wrangler.jsonc");

	it("アプリと同じ名前・同じドメインに差し替わる", () => {
		expect(maintenance.name).toBe(app.name);
		expect(maintenance.routes).toEqual(app.routes);
		expect(maintenance.workers_dev).toBe(app.workers_dev);
	});

	it("判定に使う変数を持つ（アプリの設定には、ない）", () => {
		expect(maintenance.vars).toEqual({ [MAINTENANCE_VAR_NAME]: "1" });
		expect(app.vars ?? {}).not.toHaveProperty(MAINTENANCE_VAR_NAME);
	});
});
