import type { CreateReportResult } from "../application/report-repository";
import {
	reportDetailMaxLength,
	reportReasonLabels,
	type UserReportReason,
	userReportReasons,
} from "../domain/report";
import { ReportForm } from "./report-form";

type ReportRecipeFormProps = {
	onReport: (input: {
		reason: UserReportReason;
		detail: string;
	}) => Promise<CreateReportResult>;
	onClose: () => void;
};

const resultMessages: Record<CreateReportResult, string> = {
	created: "通報しました。ご連絡ありがとうございます。",
	"not-found": "このレシピは通報できません。",
	"own-recipe": "自分のレシピは通報できません。",
	duplicate: "このレシピは、すでに通報しています。",
	limit: "今日の通報の上限に達しました。明日お試しください。",
};

// 他の人のレシピの通報（権利の侵害・不適切な内容など）。
export function ReportRecipeForm({ onReport, onClose }: ReportRecipeFormProps) {
	return (
		<ReportForm
			legend="通報の理由"
			name="report-reason"
			reasons={userReportReasons.map((option) => ({
				value: option,
				label: reportReasonLabels[option],
			}))}
			initialReason="inappropriate"
			detailMaxLength={reportDetailMaxLength}
			resultMessages={resultMessages}
			onReport={onReport}
			onClose={onClose}
		/>
	);
}
