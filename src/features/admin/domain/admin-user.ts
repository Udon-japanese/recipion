import * as v from "valibot";

export const adminUserSearchMaxLength = 50;
export const adminUserSearchLimit = 20;
export const suspensionReasonMaxLength = 200;

// 管理者の画面に出す、ユーザーの要約。メールアドレスは、出さない。
export type AdminUserSummary = {
	id: string;
	name: string;
	handle: string;
	// ISO 8601
	createdAt: string;
	// 公開（限定公開・全体公開）のレシピの数。
	publicRecipeCount: number;
	// 公開しようとして止められた回数（違反の記録）。
	violationCount: number;
	// このユーザーのレシピへの通報の数（対応済みを含む）。
	reportedCount: number;
	suspension: {
		status: "suspended" | "banned";
		reason: string;
		// ISO 8601
		suspendedAt: string;
	} | null;
};

export const adminUserSearchInputSchema = v.object({
	query: v.pipe(v.string(), v.trim(), v.maxLength(adminUserSearchMaxLength)),
});

export const suspendUserInputSchema = v.object({
	userId: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	reason: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "停止の理由を入力してください"),
		v.maxLength(
			suspensionReasonMaxLength,
			`停止の理由は${suspensionReasonMaxLength}文字までにしてください`,
		),
	),
	// true なら永久停止（同じメールアドレスの再登録も不可）。
	ban: v.boolean(),
	// true なら、このユーザーの公開（限定公開・全体公開）のレシピを、すべて非公開にする。
	makePrivate: v.boolean(),
});

export const liftSuspensionInputSchema = v.object({
	userId: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
});

export type SuspendUserResult =
	| "done"
	| "not-found"
	// 管理者のアカウントは、停止できない（間違えて、管理の画面に入れなくならないように）。
	| "protected";

export type LiftSuspensionResult = "done" | "not-suspended";
