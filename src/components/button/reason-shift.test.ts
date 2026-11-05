import { describe, expect, it } from "vitest";
import { getReasonShift } from "./reason-shift";

const bounds = { left: 0, right: 300 };

describe("無効のボタンの理由を、横にずらす量", () => {
	it.each([
		["はみ出さない", { left: 50, right: 250 }, 0],
		["左にはみ出す：右へ戻す", { left: -40, right: 160 }, 48],
		["右にはみ出す：左へ戻す", { left: 150, right: 330 }, -38],
		["両側にはみ出す：文の頭（左）を見せる", { left: -20, right: 320 }, 28],
	])("%s", (_, bubble, expected) => {
		expect(getReasonShift(bubble, bounds)).toBe(expected);
	});
});
