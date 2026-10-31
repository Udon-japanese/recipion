import {
	type CreateUserNameReportResult,
	type UserNameReportReason,
	userNameReportDetailMaxLength,
	userNameReportReasonLabels,
	userNameReportReasons,
} from "../domain/user-report";
import { ReportForm } from "./report-form";

type ReportUserFormProps = {
	onReport: (input: {
		reason: UserNameReportReason;
		detail: string;
	}) => Promise<CreateUserNameReportResult>;
	onClose: () => void;
};

const resultMessages: Record<CreateUserNameReportResult, string> = {
	created: "通報しました。ご連絡ありがとうございます。",
	"not-found": "このユーザーは通報できません。",
	"own-profile": "自分は通報できません。",
	duplicate: "このユーザー名は、すでに通報しています。",
	limit: "今日の通報の上限に達しました。明日お試しください。",
};

// 他の人のユーザー名（表示名・ハンドル）の通報（不適切な名前・なりすましなど）。
export function ReportUserForm({ onReport, onClose }: ReportUserFormProps) {
	return (
		<ReportForm
			legend="理由"
			name="report-user-reason"
			reasons={userNameReportReasons.map((option) => ({
				value: option,
				label: userNameReportReasonLabels[option],
			}))}
			initialReason="inappropriate"
			detailMaxLength={userNameReportDetailMaxLength}
			resultMessages={resultMessages}
			onReport={onReport}
			onClose={onClose}
		/>
	);
}
