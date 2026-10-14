import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import type { CreateReportResult } from "../application/report-repository";
import {
	type ReportReason,
	reportDetailMaxLength,
	reportReasonLabels,
	userReportReasons,
} from "../domain/report";
import * as styles from "./report-recipe-form.css";

type ReportRecipeFormProps = {
	onReport: (input: {
		reason: ReportReason;
		detail: string;
	}) => Promise<CreateReportResult>;
};

const resultMessages: Record<CreateReportResult, string> = {
	created: "通報しました。ご連絡ありがとうございます。",
	"not-found": "このレシピは、通報できません。",
	"own-recipe": "自分のレシピは、通報できません。",
	duplicate: "このレシピは、すでに通報しています。",
	limit: "今日の通報の上限に達しました。明日、お試しください。",
};

// 他の人のレシピの通報（権利の侵害・不適切な内容など）。
export function ReportRecipeForm({ onReport }: ReportRecipeFormProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [reason, setReason] = useState<ReportReason>("inappropriate");
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
					このレシピを通報する
				</button>
				{message ? <output className={styles.note}>{message}</output> : null}
			</div>
		);
	}

	return (
		<form className={styles.container} onSubmit={handleSubmit}>
			<fieldset className={styles.fieldset}>
				<legend>通報の理由</legend>
				{userReportReasons.map((option) => (
					<label className={styles.option} key={option}>
						<input
							type="radio"
							name="report-reason"
							checked={reason === option}
							onChange={() => setReason(option)}
						/>
						<span>{reportReasonLabels[option]}</span>
					</label>
				))}
			</fieldset>

			<label htmlFor="report-detail">詳しい内容（任意）</label>
			<textarea
				className={styles.textarea}
				id="report-detail"
				maxLength={reportDetailMaxLength}
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
