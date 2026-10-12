import type {
	AdminUserSummary,
	LiftSuspensionResult,
	SuspendUserResult,
} from "../domain/admin-user";

export type AdminUserRepository = {
	// 表示名・ハンドルの一部で探す（空なら、新しく登録した順）。
	search(query: string, limit: number): Promise<AdminUserSummary[]>;
	suspend(input: {
		userId: string;
		reason: string;
		ban: boolean;
		makePrivate: boolean;
		// 停止できない（管理者の）メールアドレスか。
		isProtectedEmail: (email: string) => boolean;
		// メールアドレスのハッシュを作る関数（永久停止のとき）。
		hashEmail: (email: string) => Promise<string>;
		now: Date;
	}): Promise<SuspendUserResult>;
	// 停止（永久停止を含む）を解除する。永久停止だったときは、メールアドレスの記録も消す。
	lift(input: {
		userId: string;
		hashEmail: (email: string) => Promise<string>;
	}): Promise<LiftSuspensionResult>;
};
