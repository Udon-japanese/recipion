import type {
	OpenReport,
	ReportAction,
	ReportReason,
	ResolvedReport,
} from "../domain/report";

export type CreateReportInput = {
	reporterUserId: string;
	recipePublicId: string;
	reason: ReportReason;
	detail: string;
	now: Date;
};

export type CreateReportResult =
	| "created"
	// 存在しない、または、通報する人には見えないレシピ。
	| "not-found"
	| "own-recipe"
	// 同じレシピを、未対応のまま、重ねて通報した。
	| "duplicate"
	// 1日の通報の上限を超えた。
	| "limit";

export type ReportRepository = {
	create(input: CreateReportInput): Promise<CreateReportResult>;
	// 公開のときの自動の判定で、怪しいとされたレシピを、通報の一覧に載せる（未対応が、すでにあれば何もしない）。
	createAutoDetected(input: {
		recipePublicId: string;
		// 欄ごとの理由（語は含まない）。
		detail: string;
		now: Date;
	}): Promise<"created" | "exists" | "not-found">;
	// 未対応の通報（古い順）。
	listOpen(): Promise<OpenReport[]>;
	// 対応済みの通報（新しい順に、limit 件）。
	listResolved(limit: number): Promise<ResolvedReport[]>;
	// 未対応の通報の数。
	countOpen(): Promise<number>;
	// 通報されたレシピの、公開 ID と、持ち主（レシピが削除されていれば null）。
	findReportedRecipe(
		reportId: string,
	): Promise<{ recipePublicId: string; ownerUserId: string } | null>;
	// 対応する。同じレシピへの、未対応の通報は、まとめて対応済みにする（却下は、その通報だけ）。
	resolve(input: {
		reportId: string;
		action: ReportAction;
		now: Date;
	}): Promise<"done" | "not-found">;
};
