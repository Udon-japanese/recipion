import { describe, expect, it } from "vitest";
import cases from "../../../shared-data/test-cases/send-code-request-hash.json";
import { sendCodeRequestHash } from "./request-hash";

// アプリ（Kotlin）も同じテストデータで確かめる（作り方がずれると、本物のアプリが証明なしになる）。
describe("sendCodeRequestHash", () => {
	it.each(cases)("$email", async ({ email, expected }) => {
		expect(await sendCodeRequestHash(email)).toBe(expected);
	});
});
