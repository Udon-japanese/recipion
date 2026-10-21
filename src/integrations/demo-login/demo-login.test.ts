import { describe, expect, it } from "vitest";
import {
	generateDemoLoginCode,
	isDemoLoginEmail,
	readDemoLoginConfig,
} from "./demo-login";

const valid = {
	DEMO_LOGIN_EMAIL: "demo-abc123@example.test",
	DEMO_LOGIN_CODE: "482915",
};

describe("readDemoLoginConfig", () => {
	it("何も設定していないときは、無効（既定）", () => {
		expect(readDemoLoginConfig({})).toBeNull();
	});

	it("メールかコードの、どちらかが欠ければ、無効", () => {
		expect(
			readDemoLoginConfig({ DEMO_LOGIN_EMAIL: valid.DEMO_LOGIN_EMAIL }),
		).toBeNull();
		expect(
			readDemoLoginConfig({ DEMO_LOGIN_CODE: valid.DEMO_LOGIN_CODE }),
		).toBeNull();
		expect(readDemoLoginConfig({ ...valid, DEMO_LOGIN_CODE: "" })).toBeNull();
	});

	it("コードが6桁の数字でなければ、無効", () => {
		for (const code of ["12345", "1234567", "abcdef", "12 456"]) {
			expect(
				readDemoLoginConfig({ ...valid, DEMO_LOGIN_CODE: code }),
			).toBeNull();
		}
	});

	it("メールアドレスの形でなければ、無効", () => {
		expect(
			readDemoLoginConfig({ ...valid, DEMO_LOGIN_EMAIL: "not-an-email" }),
		).toBeNull();
	});

	it("両方そろえば有効。メールは、空白を除き、小文字にする", () => {
		expect(
			readDemoLoginConfig({
				DEMO_LOGIN_EMAIL: "  Demo-ABC123@Example.test ",
				DEMO_LOGIN_CODE: " 482915 ",
			}),
		).toEqual({ email: "demo-abc123@example.test", code: "482915" });
	});

	it("管理者のメールアドレスは、無効にする（固定のコードで、管理者の権限を渡さない）", () => {
		expect(
			readDemoLoginConfig({
				...valid,
				ADMIN_EMAILS: "boss@example.test, Demo-ABC123@example.test",
			}),
		).toBeNull();
	});
});

describe("確認用アカウントの判定とコード", () => {
	const config = readDemoLoginConfig(valid);

	it("確認用のアドレス（大文字・小文字の違いは同じ）だけ、固定のコードになる", () => {
		expect(isDemoLoginEmail(config, "DEMO-abc123@example.test")).toBe(true);
		expect(generateDemoLoginCode(config, "demo-abc123@example.test")).toBe(
			"482915",
		);
	});

	it("ほかのアドレスは、通常のコード（undefined）を使う", () => {
		expect(isDemoLoginEmail(config, "someone@example.test")).toBe(false);
		expect(
			generateDemoLoginCode(config, "someone@example.test"),
		).toBeUndefined();
	});

	it("無効のときは、確認用のアドレスでも、固定のコードにしない", () => {
		expect(generateDemoLoginCode(null, valid.DEMO_LOGIN_EMAIL)).toBeUndefined();
		expect(isDemoLoginEmail(null, valid.DEMO_LOGIN_EMAIL)).toBe(false);
	});
});
