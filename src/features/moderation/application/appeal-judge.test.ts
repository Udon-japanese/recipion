import { describe, expect, it } from "vitest";
import {
	buildAppealMessages,
	createAppealJudge,
	parseAppealResponse,
} from "./appeal-judge";

describe("appeal judge", () => {
	it("応答から、判定を取り出す。不正な値は例外", () => {
		expect(parseAppealResponse('{"verdict":"legitimate"}')).toBe("legitimate");
		expect(
			parseAppealResponse('説明です {"verdict":"Not-Legitimate"} 以上'),
		).toBe("not-legitimate");
		expect(() => parseAppealResponse('{"verdict":"ok"}')).toThrow();
		expect(() => parseAppealResponse("JSON なし")).toThrow();
	});

	it("申し立ての文章は、毎回違う目印で囲んで渡す", async () => {
		const messages = buildAppealMessages("ごめんなさい", "N1");

		expect(messages[1]?.content).toContain(
			"<<<DATA-N1>>>\nごめんなさい\n<<<END-N1>>>",
		);

		const judge = createAppealJudge(
			async () => '{"verdict":"unsure"}',
			() => "N2",
		);

		expect(await judge("あ")).toBe("unsure");
	});
});
