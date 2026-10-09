import * as v from "valibot";

// 通報の理由。
export const reportReasons = ["copyright", "inappropriate", "other"] as const;

export type ReportReason = (typeof reportReasons)[number];

export const reportReasonLabels: Record<ReportReason, string> = {
	copyright: "権利を侵害している",
	inappropriate: "不適切な内容",
	other: "その他",
};

export const reportDetailMaxLength = 1000;

// 通報への対応。
export const reportActions = ["make-private", "delete", "dismiss"] as const;

export type ReportAction = (typeof reportActions)[number];

export const reportActionLabels: Record<ReportAction, string> = {
	"make-private": "非公開にする",
	delete: "削除する",
	dismiss: "対応しない（却下）",
};

// 1人が、1日に出せる通報の数（いやがらせの防止）。
export const maxReportsPerDay = 10;

export const createReportInputSchema = v.object({
	recipePublicId: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	reason: v.picklist(reportReasons),
	detail: v.pipe(v.string(), v.trim(), v.maxLength(reportDetailMaxLength)),
});

export const resolveReportInputSchema = v.object({
	reportId: v.pipe(v.string(), v.uuid()),
	action: v.picklist(reportActions),
});

// 管理者の画面に出す、未対応の通報。
export type OpenReport = {
	id: string;
	recipePublicId: string;
	// 通報のあと、レシピが削除されたときは、通報したときの名前。
	recipeName: string;
	// レシピが、いまも、あるか。
	recipeExists: boolean;
	ownerName: string | null;
	ownerHandle: string | null;
	reason: ReportReason;
	detail: string;
	// ISO 8601
	createdAt: string;
};
