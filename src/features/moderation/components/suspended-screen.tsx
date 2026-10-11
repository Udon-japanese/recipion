import { type SubmitEvent, useState } from "react";
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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [sentCount, setSentCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmed = message.trim();

		if (trimmed === "") {
			setErrorMessage("申し立ての内容を入力してください");

			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const result = await onSubmitAppeal(trimmed);

			if (result.status === "submitted") {
				setSentCount((current) => current + 1);
				setMessage("");
			} else {
				setErrorMessage("申し立てを受け付けられませんでした");
			}
		} catch {
			setErrorMessage("送れませんでした。もう一度お試しください");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (status === "banned") {
		return (
			<section className={styles.container}>
				<h1 className={styles.title}>このアカウントは、利用できません</h1>
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
				公開できない内容を、繰り返し投稿しようとしたため、このアカウントを停止しました。
				誤りだと思われる場合や、反省されている場合は、下の欄から、申し立てをしてください。
				申し立ては、何度でもできます。内容は、管理者が確認します。
			</p>
			<p className={styles.text}>
				ただし、申し立ての内容が、正当なものと認められないときは、このアカウントを永久に停止し、同じメールアドレスでは、登録できなくなることがあります。
			</p>

			<form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
				<label htmlFor="appeal-message">申し立ての内容</label>
				<textarea
					className={styles.textarea}
					id="appeal-message"
					maxLength={appealMessageMaxLength}
					value={message}
					onChange={(event) => setMessage(event.target.value)}
				/>
				<p className={styles.count}>
					{message.length} / {appealMessageMaxLength}
				</p>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
				{sentCount > 0 ? (
					<output className={styles.text}>
						申し立てを送りました。管理者の確認をお待ちください。
					</output>
				) : null}

				<button className={styles.button} type="submit" disabled={isSubmitting}>
					申し立てを送る
				</button>
			</form>
		</section>
	);
}
