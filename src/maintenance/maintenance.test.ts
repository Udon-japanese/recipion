import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
	createMaintenanceResponse,
	isMaintenanceActive,
	MAINTENANCE_VAR_NAME,
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
