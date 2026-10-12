import type {
	AppealAction,
	AppealVerdict,
	OpenAppeal,
	ResolvedAppeal,
} from "../domain/appeal";

export type SubmitAppealResult =
	| { status: "submitted"; verdict: AppealVerdict }
	// 停止されていない・永久停止されている（申し立てを受け付けない）。
	| { status: "not-allowed" };

export type AppealRepository = {
	getSuspension(userId: string): Promise<"suspended" | "banned" | null>;
	// 指定した時刻以降の、そのユーザーの申し立ての数。
	countAppealsSince(userId: string, since: Date): Promise<number>;
	create(input: {
		userId: string;
		message: string;
		verdict: AppealVerdict;
		now: Date;
	}): Promise<void>;
	listOpen(): Promise<OpenAppeal[]>;
	// 対応済みの申し立て（新しい順に、limit 件）。
	listResolved(limit: number): Promise<ResolvedAppeal[]>;
	// 未対応の申し立ての数。
	countOpen(): Promise<number>;
	resolve(input: {
		appealId: string;
		action: AppealAction;
		// メールアドレスのハッシュを作る関数（永久停止のとき）。
		hashEmail: (email: string) => Promise<string>;
		now: Date;
	}): Promise<"done" | "not-found">;
};
