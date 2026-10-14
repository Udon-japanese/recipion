import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Field, TextArea } from "#/components/field/field";
import { Note } from "#/components/note/note";
import { RadioList } from "#/components/radio-list/radio-list";
import {
	type CreateUserNameReportResult,
	type UserNameReportReason,
	userNameReportDetailMaxLength,
	userNameReportReasonLabels,
	userNameReportReasons,
} from "../domain/user-report";
import * as styles from "./report-recipe-form.css";

type ReportUserFormProps = {
	onReport: (input: {
		reason: UserNameReportReason;
		detail: string;
	}) => Promise<CreateUserNameReportResult>;
};

const resultMessages: Record<CreateUserNameReportResult, string> = {
	created: "通報しました。ご連絡ありがとうございます。",
	"not-found": "このユーザーは、通報できません。",
	"own-profile": "自分は、通報できません。",
	duplicate: "このユーザー名は、すでに通報しています。",
	limit: "今日の通報の上限に達しました。明日、お試しください。",
};

// 他の人のユーザー名（表示名・ハンドル）の通報（不適切な名前・なりすましなど）。
export function ReportUserForm({ onReport }: ReportUserFormProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [reason, setReason] = useState<UserNameReportReason>("inappropriate");
	const [detail, setDetail] = useState("");
	const action = useButtonAction();
	const [message, setMessage] = useState<string | null>(null);

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		void action.run(submit);
	}

	async function submit() {
		setMessage(null);

		try {
			const result = await onReport({ reason, detail: detail.trim() });

			setMessage(resultMessages[result]);

			if (result === "created") {
				setIsOpen(false);
				setDetail("");
			}

			return result === "created";
		} catch {
			setMessage("通報できませんでした。もう一度お試しください");

			return false;
		}
	}

	if (!isOpen) {
		return (
			<div className={styles.container}>
				<Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
					この作者のユーザー名を通報する
				</Button>
				{message ? <Note>{message}</Note> : null}
			</div>
		);
	}

	return (
		<form className={styles.container} onSubmit={handleSubmit}>
			<RadioList
				legend="ユーザー名の通報の理由"
				name="report-user-reason"
				value={reason}
				onChange={setReason}
				options={userNameReportReasons.map((option) => ({
					value: option,
					label: userNameReportReasonLabels[option],
				}))}
			/>

			<Field label="詳しい内容" optional>
				{(control) => (
					<TextArea
						{...control}
						maxLength={userNameReportDetailMaxLength}
						value={detail}
						onChange={(event) => setDetail(event.target.value)}
					/>
				)}
			</Field>

			{message ? <Note tone="error">{message}</Note> : null}

			<div className={styles.actions}>
				<Button
					type="submit"
					size="sm"
					status={action.status}
					successLabel="通報しました"
					errorLabel="送れませんでした"
				>
					通報する
				</Button>
				<Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
					やめる
				</Button>
			</div>
		</form>
	);
}
