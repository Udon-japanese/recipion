import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
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
				<button
					className={styles.button}
					type="button"
					onClick={() => setIsOpen(true)}
				>
					この作者のユーザー名を通報する
				</button>
				{message ? <output className={styles.note}>{message}</output> : null}
			</div>
		);
	}

	return (
		<form className={styles.container} onSubmit={handleSubmit}>
			<fieldset className={styles.fieldset}>
				<legend>ユーザー名の通報の理由</legend>
				{userNameReportReasons.map((option) => (
					<label className={styles.option} key={option}>
						<input
							type="radio"
							name="user-report-reason"
							checked={reason === option}
							onChange={() => setReason(option)}
						/>
						<span>{userNameReportReasonLabels[option]}</span>
					</label>
				))}
			</fieldset>

			<label htmlFor="user-report-detail">詳しい内容（任意）</label>
			<textarea
				className={styles.textarea}
				id="user-report-detail"
				maxLength={userNameReportDetailMaxLength}
				value={detail}
				onChange={(event) => setDetail(event.target.value)}
			/>

			{message ? (
				<p className={styles.note} role="alert">
					{message}
				</p>
			) : null}

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
				<button
					className={styles.button}
					type="button"
					onClick={() => setIsOpen(false)}
				>
					やめる
				</button>
			</div>
		</form>
	);
}
