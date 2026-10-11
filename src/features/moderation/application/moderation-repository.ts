import type {
	ModerationCategory,
	ModerationReason,
} from "../domain/moderation-result";

export type AccountSuspensionStatus = "suspended" | "banned";

export type CachedDecision = {
	decision: "allow" | "flag" | "block";
	reasons: ModerationReason[];
};

// 違反・判定の結果の記録・停止の状態。
export type ModerationRepository = {
	getSuspension(userId: string): Promise<AccountSuspensionStatus | null>;
	suspend(input: { userId: string; reason: string; now: Date }): Promise<void>;
	// 指定した時刻以降の、違反の時刻。
	listViolationTimes(userId: string, since: Date): Promise<Date[]>;
	recordViolation(input: {
		userId: string;
		now: Date;
		categories: ModerationCategory[];
	}): Promise<void>;
	getCached(contentHash: string): Promise<CachedDecision | null>;
	putCached(input: {
		contentHash: string;
		userId: string;
		decision: CachedDecision;
		now: Date;
	}): Promise<void>;
	// 指定した時刻以降に、そのユーザーが AI を使った判定の回数（キャッシュの記録を数える）。
	countAiChecksSince(userId: string, since: Date): Promise<number>;
};
