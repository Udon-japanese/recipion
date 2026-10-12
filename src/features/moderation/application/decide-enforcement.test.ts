import { describe, expect, it } from "vitest";
import type { ModerationReason } from "../domain/moderation-result";
import { moderationTargets } from "../domain/moderation-target";
import { decideEnforcement } from "./decide-enforcement";

const recipeFlag: ModerationReason = {
	target: "recipe-note",
	source: "ai",
	category: "other",
};
const nameFlag: ModerationReason = {
	target: "profile-display-name",
	source: "ai",
	category: "other",
};

describe("moderation target registry", () => {
	it("すべての欄に、説明・名前・「怪しい」のときの扱いがある", () => {
		for (const target of Object.values(moderationTargets)) {
			expect(target.description).not.toBe("");
			expect(target.label).not.toBe("");
			expect(["allow", "reject"]).toContain(target.onFlag);
		}
	});
});

describe("decideEnforcement", () => {
	it("問題なければ allowed。flagged の欄が allow なら、通して、理由を渡す", () => {
		expect(decideEnforcement({ status: "ok" })).toEqual({
			status: "allowed",
			flagged: null,
		});
		expect(
			decideEnforcement({ status: "flagged", reasons: [recipeFlag] }),
		).toEqual({ status: "allowed", flagged: [recipeFlag] });
	});

	it("flagged の欄が reject（表示名など）なら、断る。原因の欄を返す。止めた語は見せない", () => {
		const result = decideEnforcement({
			status: "flagged",
			reasons: [recipeFlag, nameFlag],
		});

		expect(result).toMatchObject({
			status: "refused",
			targets: ["profile-display-name"],
		});
		expect(result.status === "refused" && result.message).toContain("表示名");
	});

	it("rejected（止めた）は、断る。欄を返す。停止中・上限などは、欄なしで断る", () => {
		expect(
			decideEnforcement({
				status: "rejected",
				warning: "warned",
				reasons: [nameFlag],
			}),
		).toMatchObject({ status: "refused", targets: ["profile-display-name"] });
		expect(decideEnforcement({ status: "suspended" })).toMatchObject({
			status: "refused",
			targets: [],
		});
		expect(decideEnforcement({ status: "unavailable" })).toMatchObject({
			status: "refused",
			targets: [],
		});
	});
});
