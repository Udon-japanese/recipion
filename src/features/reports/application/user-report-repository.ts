import type {
	CreateUserNameReportResult,
	OpenUserNameReport,
	ResolvedUserNameReport,
	UserNameReportAction,
	UserNameReportReason,
} from "../domain/user-report";

export type UserReportRepository = {
	create(input: {
		reporterUserId: string;
		// 通報されるユーザーのハンドル。
		handle: string;
		reason: UserNameReportReason;
		detail: string;
		now: Date;
	}): Promise<CreateUserNameReportResult>;
	// 未対応の通報（古い順）。
	listOpen(): Promise<OpenUserNameReport[]>;
	// 対応済みの通報（新しい順に、limit 件）。
	listResolved(limit: number): Promise<ResolvedUserNameReport[]>;
	countOpen(): Promise<number>;
	// 対応する。同じユーザーへの、未対応の通報は、まとめて対応済みにする（却下は、その通報だけ）。
	resolve(input: {
		reportId: string;
		action: UserNameReportAction;
		// 名前を戻すときの、新しいハンドルを作る関数（重なったときは、作り直す）。
		generateHandle: () => string;
		now: Date;
	}): Promise<"done" | "not-found">;
};
