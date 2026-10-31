import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Field, TextArea } from "#/components/field/field";
import { Note } from "#/components/note/note";
import { RadioList } from "#/components/radio-list/radio-list";
import * as styles from "./report-form.css";

type ReportFormProps<Reason extends string, Result extends string> = {
	legend: string;
	name: string;
	reasons: readonly { value: Reason; label: string }[];
	initialReason: Reason;
	detailMaxLength: number;
	// 結果ごとの文言。created だけが、送れたとき。
	resultMessages: Record<Result | "created", string>;
	onReport: (input: {
		reason: Reason;
		detail: string;
	}) => Promise<Result | "created">;
	onClose: () => void;
};

// 通報のフォーム（ダイアログの中身）。送れたら、お礼と「閉じる」に替わる。
export function ReportForm<Reason extends string, Result extends string>({
	legend,
	name,
	reasons,
	initialReason,
	detailMaxLength,
	resultMessages,
	onReport,
	onClose,
}: ReportFormProps<Reason, Result>) {
	const [reason, setReason] = useState<Reason>(initialReason);
	const [detail, setDetail] = useState("");
	const action = useButtonAction();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isDone, setIsDone] = useState(false);

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		void action.run(submit);
	}

	async function submit() {
		setErrorMessage(null);

		try {
			const result = await onReport({ reason, detail: detail.trim() });

			if (result === "created") {
				setIsDone(true);

				return true;
			}

			setErrorMessage(resultMessages[result]);

			return false;
		} catch {
			setErrorMessage("通報できませんでした。もう一度お試しください");

			return false;
		}
	}

	if (isDone) {
		return (
			<div className={styles.form}>
				<Note tone="success">{resultMessages.created}</Note>
				<div className={styles.actions}>
					<Button variant="secondary" onClick={onClose}>
						閉じる
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<RadioList
				legend={legend}
				name={name}
				value={reason}
				onChange={setReason}
				options={reasons}
			/>

			<Field label="詳しい内容" optional>
				{(control) => (
					<TextArea
						{...control}
						maxLength={detailMaxLength}
						value={detail}
						onChange={(event) => setDetail(event.target.value)}
					/>
				)}
			</Field>

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}

			<div className={styles.actions}>
				<Button variant="secondary" onClick={onClose}>
					やめる
				</Button>
				<Button
					type="submit"
					status={action.status}
					successLabel="通報しました"
					errorLabel="送れませんでした"
				>
					通報する
				</Button>
			</div>
		</form>
	);
}
