import { describe, expect, it, vi } from "vitest";
import type { AiJudge, AiVerdict } from "./ai-judge";
import { type ModerationLexicons, moderateContent } from "./moderate-content";

const ok: AiVerdict = { verdict: "ok", category: "other" };

// テストでは、実在する不適切な語ではなく、架空の語を使う。
const lexicons: ModerationLexicons = {
	hard: [{ category: "violence", terms: ["ぴよぴよ"] }],
	hardEmoji: [{ category: "discrimination", emoji: ["🧿", "🪬"] }],
	hintEmoji: ["🪄"],
	context: [{ category: "harassment", terms: ["ぽんぽこ"] }],
	innocentPhrases: ["ぽんぽこ山"],
};

function judgeReturning(...verdicts: AiVerdict[]): AiJudge {
	return vi.fn(async () => verdicts);
}

describe("moderateContent", () => {
	it("確定で弾く語があれば、AI に聞かずに、block（どの欄・手段・種類かを返す。語は返さない）", async () => {
		const judge = judgeReturning(ok);
		const result = await moderateContent(
			[
				{ target: "recipe-title", text: "おいしいスープ" },
				{ target: "recipe-note", text: "お前、ぴ.よ.ぴ.よ" },
			],
			judge,
			lexicons,
		);

		expect(result).toEqual({
			decision: "block",
			reasons: [
				{ target: "recipe-note", source: "lexicon", category: "violence" },
			],
		});
		expect(judge).not.toHaveBeenCalled();
	});

	it("空の文章は、判定に出さない。すべて空なら、allow（AI も呼ばない）", async () => {
		const judge = judgeReturning();

		expect(
			await moderateContent(
				[{ target: "recipe-note", text: "  \n" }],
				judge,
				lexicons,
			),
		).toEqual({ decision: "allow" });
		expect(judge).not.toHaveBeenCalled();
	});

	it("AI が ok なら allow。ng なら block。unsure なら flag", async () => {
		const items = [
			{ target: "recipe-title" as const, text: "カレー" },
			{ target: "recipe-note" as const, text: "あれ" },
		];

		expect(
			await moderateContent(items, judgeReturning(ok, ok), lexicons),
		).toEqual({
			decision: "allow",
		});
		expect(
			await moderateContent(
				items,
				judgeReturning(ok, { verdict: "ng", category: "spam" }),
				lexicons,
			),
		).toEqual({
			decision: "block",
			reasons: [{ target: "recipe-note", source: "ai", category: "spam" }],
		});
		expect(
			await moderateContent(
				items,
				judgeReturning({ verdict: "unsure", category: "harassment" }, ok),
				lexicons,
			),
		).toEqual({
			decision: "flag",
			reasons: [
				{ target: "recipe-title", source: "ai", category: "harassment" },
			],
		});
	});

	it("ng と unsure が混ざれば、block（ng を優先）", async () => {
		const result = await moderateContent(
			[
				{ target: "recipe-title", text: "a" },
				{ target: "recipe-note", text: "b" },
			],
			judgeReturning(
				{ verdict: "unsure", category: "other" },
				{ verdict: "ng", category: "sexual" },
			),
		);

		expect(result.decision).toBe("block");
	});

	it("AI が失敗した・件数が合わないときは、unavailable（公開を止める）", async () => {
		const items = [{ target: "recipe-note" as const, text: "x" }];

		expect(
			await moderateContent(items, async () => {
				throw new Error("上限");
			}),
		).toEqual({ decision: "unavailable" });
		expect(await moderateContent(items, judgeReturning(), lexicons)).toEqual({
			decision: "unavailable",
		});
	});

	it("注意する語と、そろえた文章を、AI に渡す。調理の言葉は、注意する語にしない", async () => {
		const judge = vi.fn(async (_items: readonly unknown[]) => [ok, ok]);

		await moderateContent(
			[
				{ target: "recipe-instruction", text: "これはぽんぽこだ。ＢＡＫＡ" },
				{ target: "recipe-instruction", text: "ぽんぽこ山に登る" },
			],
			judge,
			lexicons,
		);

		const [first, second] = (judge.mock.calls[0]?.[0] ?? []) as {
			text: string;
			normalizedText: string;
			hints: string[];
		}[];

		expect(first?.hints).toContain("ぽんぽこ");
		expect(first?.normalizedText).toBe("これはぽんぽこだ。baka");
		expect(second?.hints).toEqual([]);
	});

	it("長い文章は、分けて渡す（後ろの部分も、見落とさない）", async () => {
		const judge = vi.fn(async (items: readonly unknown[]) =>
			items.map(() => ok),
		);
		const longText = Array.from(
			{ length: 400 },
			(_, i) => `手順${i}を行う。`,
		).join("\n");

		await moderateContent(
			[{ target: "recipe-instruction", text: longText }],
			judge,
		);

		expect(judge.mock.calls[0]?.[0].length).toBeGreaterThan(1);
	});

	it("絵文字の組み合わせ（ZWJ の連結を含む）で、確定で止める。1つだけなら、止めない", async () => {
		const judge = judgeReturning(ok);

		expect(
			await moderateContent(
				[{ target: "recipe-note", text: "🧿と🪬" }],
				judge,
				lexicons,
			),
		).toEqual({
			decision: "block",
			reasons: [
				{ target: "recipe-note", source: "emoji", category: "discrimination" },
			],
		});
		expect(
			await moderateContent(
				[{ target: "recipe-note", text: "🧿だけ" }],
				judge,
				lexicons,
			),
		).toEqual({ decision: "allow" });
	});

	it("単独でも意味を持ちうる絵文字は、止めずに、注意する語として AI に渡す", async () => {
		const judge = vi.fn(async (_items: readonly unknown[]) => [ok]);

		await moderateContent(
			[{ target: "recipe-note", text: "おいしい🪄" }],
			judge,
			lexicons,
		);

		const [first] = (judge.mock.calls[0]?.[0] ?? []) as { hints: string[] }[];

		expect(first?.hints).toContain("🪄");
	});
});
