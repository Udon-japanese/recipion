import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Card } from "#/components/card/card";
import { Field, TextArea } from "#/components/field/field";
import { Note } from "#/components/note/note";
import { appealMessageMaxLength } from "../domain/appeal";
import * as styles from "./suspended-screen.css";

type SuspendedScreenProps = {
	status: "suspended" | "banned";
	onSubmitAppeal: (message: string) => Promise<{ status: string }>;
};

// 停止中のアカウントに、アプリの代わりに出す画面。停止（suspended）のときだけ、申し立てができる。
export function SuspendedScreen({
	status,
	onSubmitAppeal,
}: SuspendedScreenProps) {
	const [message, setMessage] = useState("");
	const action = useButtonAction();
	const [sentCount, setSentCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmed = message.trim();

		if (trimmed === "") {
			setErrorMessage("申し立ての内容を入力してください");

			return;
		}

		void action.run(() => submit(trimmed));
	}

	async function submit(trimmed: string) {
		setErrorMessage(null);

		try {
			const result = await onSubmitAppeal(trimmed);

			if (result.status === "submitted") {
				setSentCount((current) => current + 1);
				setMessage("");

				return true;
			}

			setErrorMessage("申し立てを受け付けられませんでした");

			return false;
		} catch {
			setErrorMessage("送れませんでした。もう一度お試しください");

			return false;
		}
	}

	if (status === "banned") {
		return (
			<section className={styles.container}>
				<h1 className={styles.title}>このアカウントは利用できません</h1>
				<p className={styles.text}>
					利用規約に反する投稿が続いたため、このアカウントは永久に停止されました。
				</p>
			</section>
		);
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>アカウントが停止されています</h1>
			<p className={styles.text}>
				公開できない内容を繰り返し投稿しようとしたため、このアカウントを停止しました。
				誤りだと思われる場合や反省されている場合は、下の欄から申し立てをしてください。
				申し立ては何度でもできます。内容は管理者が確認します。
			</p>
			<p className={styles.text}>
				ただし、申し立ての内容が正当なものと認められないときは、このアカウントを永久に停止し、同じメールアドレスでは登録できなくなることがあります。
			</p>

			<Card padding="md">
				<form className={styles.form} onSubmit={handleSubmit}>
					<Field
						label="申し立ての内容"
						hint={`${message.length} / ${appealMessageMaxLength}`}
					>
						{(control) => (
							<TextArea
								{...control}
								maxLength={appealMessageMaxLength}
								value={message}
								onChange={(event) => setMessage(event.target.value)}
							/>
						)}
					</Field>

					{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
					{sentCount > 0 ? (
						<Note tone="success">
							申し立てを送りました。管理者の確認をお待ちください。
						</Note>
					) : null}

					<Button
						type="submit"
						status={action.status}
						successLabel="送りました"
						errorLabel="送れませんでした"
					>
						申し立てを送る
					</Button>
				</form>
			</Card>
		</section>
	);
}
