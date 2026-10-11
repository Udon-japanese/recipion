import { describe, expect, it, vi } from "vitest";
import type { AppealVerdict } from "../domain/appeal";
import type { AppealRepository } from "./appeal-repository";
import { submitAppeal } from "./submit-appeal";

function fakeRepository(options: {
	suspension: "suspended" | "banned" | null;
	todayCount?: number;
}) {
	const created: { verdict: AppealVerdict }[] = [];
	const repository: AppealRepository = {
		getSuspension: async () => options.suspension,
		countAppealsSince: async () => options.todayCount ?? 0,
		create: async ({ verdict }) => {
			created.push({ verdict });
		},
		listOpen: async () => [],
		resolve: async () => "done",
	};

	return { repository, created };
}

const now = new Date("2026-10-11T03:00:00Z");

describe("submitAppeal", () => {
	it("停止中なら受け付けて、AI の見立てを添える", async () => {
		const { repository, created } = fakeRepository({ suspension: "suspended" });

		expect(
			await submitAppeal(
				{ userId: "u", message: "誤判定だと思います", now },
				{ repository, judge: async () => "legitimate" },
			),
		).toEqual({ status: "submitted", verdict: "legitimate" });
		expect(created).toEqual([{ verdict: "legitimate" }]);
	});

	it("停止されていない・永久停止の人は、受け付けない", async () => {
		for (const suspension of [null, "banned"] as const) {
			const { repository, created } = fakeRepository({ suspension });
			const judge = vi.fn(async () => "legitimate" as const);

			expect(
				await submitAppeal(
					{ userId: "u", message: "あ", now },
					{ repository, judge },
				),
			).toEqual({ status: "not-allowed" });
			expect(judge).not.toHaveBeenCalled();
			expect(created).toEqual([]);
		}
	});

	it("1日の AI 判定の上限を超えた分と、AI の失敗は、判定せずに受け付ける", async () => {
		const over = fakeRepository({ suspension: "suspended", todayCount: 5 });
		const judge = vi.fn(async () => "legitimate" as const);

		await submitAppeal(
			{ userId: "u", message: "あ", now },
			{ repository: over.repository, judge },
		);

		expect(judge).not.toHaveBeenCalled();
		expect(over.created).toEqual([{ verdict: "not-judged" }]);

		const failed = fakeRepository({ suspension: "suspended" });

		await submitAppeal(
			{ userId: "u", message: "あ", now },
			{
				repository: failed.repository,
				judge: async () => {
					throw new Error("障害");
				},
			},
		);

		expect(failed.created).toEqual([{ verdict: "not-judged" }]);
	});
});
