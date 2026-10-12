import * as v from "valibot";

export const appealMessageMaxLength = 1000;

export const appealInputSchema = v.object({
	message: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1),
		v.maxLength(appealMessageMaxLength),
	),
});

// AI の見立て。決めるのは管理者（AI は、候補を示すだけ）。
// not-judged: 1日の AI の判定の上限を超えたので、判定していない。
export const appealVerdicts = [
	"legitimate",
	"not-legitimate",
	"unsure",
	"not-judged",
] as const;

export type AppealVerdict = (typeof appealVerdicts)[number];

export const appealVerdictLabels: Record<AppealVerdict, string> = {
	legitimate: "AI の見立て：正当な申し立て",
	"not-legitimate": "AI の見立て：正当ではない",
	unsure: "AI の見立て：判断できない",
	"not-judged": "AI は判定していません",
};

// 管理者の対応。lift: 停止を解除 / ban: 永久停止（同じメールアドレスの再登録も不可） / reject: 停止を続ける。
export const appealActions = ["lift", "ban", "reject"] as const;

export type AppealAction = (typeof appealActions)[number];

export const appealActionLabels: Record<AppealAction, string> = {
	lift: "停止を解除する",
	ban: "永久停止にする",
	reject: "申し立てを退ける（停止は続く）",
};

export const resolveAppealInputSchema = v.object({
	appealId: v.pipe(v.string(), v.uuid()),
	action: v.picklist(appealActions),
});

// 1人が、1日に AI で判定してもらえる申し立ての数（申し立て自体は、何度でもできる）。
export const maxJudgedAppealsPerDay = 5;

export type AppealResolution = "lifted" | "banned" | "rejected";

export const appealResolutionLabels: Record<AppealResolution, string> = {
	lifted: "停止を解除した",
	banned: "永久停止にした",
	rejected: "申し立てを退けた",
};

// 対応済みの履歴で、出す件数（新しい順）。
export const resolvedAppealHistoryLimit = 100;

// 管理者の画面に出す、対応済みの申し立て（履歴）。
export type ResolvedAppeal = {
	id: string;
	userName: string;
	userHandle: string | null;
	message: string;
	verdict: AppealVerdict;
	resolution: AppealResolution;
	// ISO 8601
	createdAt: string;
	resolvedAt: string;
};

export type OpenAppeal = {
	id: string;
	userName: string;
	userHandle: string | null;
	userEmail: string;
	message: string;
	verdict: AppealVerdict;
	// ISO 8601
	createdAt: string;
	suspendedAt: string | null;
	// この停止の種類（banned の人からの申し立ては、受け付けない）。
	suspensionReason: string | null;
};
