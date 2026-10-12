import * as v from "valibot";

// 利用者が選べる、ユーザー名（表示名・ハンドル）への通報の理由。
export const userNameReportReasons = [
	"inappropriate",
	"impersonation",
	"other",
] as const;

export type UserNameReportReason = (typeof userNameReportReasons)[number];

export const userNameReportReasonLabels: Record<UserNameReportReason, string> =
	{
		inappropriate: "不適切な名前",
		impersonation: "他の人・団体になりすましている",
		other: "その他",
	};

export const userNameReportDetailMaxLength = 1000;

// 1人が、1日に出せる、ユーザー名の通報の数（いやがらせの防止）。
export const maxUserNameReportsPerDay = 10;

// 管理者の対応。reset-name: 表示名を初期値に、ハンドルを自動の値に戻す / dismiss: 対応しない（却下）。
// 停止したときは、停止の操作の中で、そのユーザーの未対応の通報が「停止した」で対応済みになる。
export const userNameReportActions = ["reset-name", "dismiss"] as const;

export type UserNameReportAction = (typeof userNameReportActions)[number];

export const userNameReportActionLabels: Record<UserNameReportAction, string> =
	{
		"reset-name": "名前を初期値に戻す",
		dismiss: "対応しない（却下）",
	};

export type UserNameReportResolution = "name-reset" | "suspended" | "dismissed";

export const userNameReportResolutionLabels: Record<
	UserNameReportResolution,
	string
> = {
	"name-reset": "名前を初期値に戻した",
	suspended: "停止した",
	dismissed: "却下した",
};

export const createUserNameReportInputSchema = v.object({
	handle: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
	reason: v.picklist(userNameReportReasons),
	detail: v.pipe(
		v.string(),
		v.trim(),
		v.maxLength(userNameReportDetailMaxLength),
	),
});

export const resolveUserNameReportInputSchema = v.object({
	reportId: v.pipe(v.string(), v.uuid()),
	action: v.picklist(userNameReportActions),
});

export type CreateUserNameReportResult =
	| "created"
	// 存在しないハンドル。
	| "not-found"
	| "own-profile"
	// 同じユーザーを、未対応のまま、重ねて通報した。
	| "duplicate"
	// 1日の通報の上限を超えた。
	| "limit";

// 管理者の画面に出す、未対応のユーザー名の通報。名前とハンドルは、通報したときの控え（あとで変わることがある）。
export type OpenUserNameReport = {
	id: string;
	reportedName: string;
	reportedHandle: string;
	// いまの名前とハンドル（ユーザーが削除されていれば null）。
	currentName: string | null;
	currentHandle: string | null;
	reason: UserNameReportReason;
	detail: string;
	// ISO 8601
	createdAt: string;
};

export type ResolvedUserNameReport = OpenUserNameReport & {
	resolution: UserNameReportResolution;
	resolvedAt: string;
};
