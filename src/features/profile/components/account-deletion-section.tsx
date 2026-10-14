import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Field, TextInput } from "#/components/field/field";
import { Note } from "#/components/note/note";
import * as styles from "./account-deletion-section.css";

type AccountDeletionSectionProps = {
	handle: string;
	// 確認のメールを送る。送れたら true。
	onRequestDeletion: () => Promise<boolean>;
};

type Step = "closed" | "confirming" | "sent";

// アカウントの削除。ハンドルを入力 → 確認のメールを送る → メールのリンクを開くと、すぐに削除される。
export function AccountDeletionSection({
	handle,
	onRequestDeletion,
}: AccountDeletionSectionProps) {
	const [step, setStep] = useState<Step>("closed");
	const [typedHandle, setTypedHandle] = useState("");
	const action = useButtonAction();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function send() {
		setErrorMessage(null);

		try {
			if (await onRequestDeletion()) {
				setStep("sent");

				return true;
			}

			setErrorMessage(
				"確認のメールを送れませんでした。時間をおいて、もう一度お試しください。",
			);

			return false;
		} catch {
			setErrorMessage(
				"確認のメールを送れませんでした。時間をおいて、もう一度お試しください。",
			);

			return false;
		}
	}

	return (
		<section className={styles.container} aria-label="アカウントの削除">
			<h2 className={styles.title}>アカウントの削除</h2>

			{step === "closed" ? (
				<>
					<p className={styles.note}>
						アカウントと、保存した情報を削除します。削除は、すぐに行われ、取り消せません。
					</p>
					<div className={styles.actions}>
						<Button variant="danger" onClick={() => setStep("confirming")}>
							アカウントを削除する
						</Button>
					</div>
				</>
			) : null}

			{step === "confirming" ? (
				<>
					<ul className={styles.list}>
						<li>
							削除されるもの：レシピ（公開したものを含む）、在庫、食材の設定、表示名・ハンドル、ログインの状態。
						</li>
						<li>
							公開していたレシピへの他の人のリンクは、「見つからない」になります。
						</li>
						<li>
							残るもの：他の人から受けた通報の記録（あなたの情報は含みません）。
						</li>
						<li>この端末の買い物メモなどのデータも、削除されます。</li>
					</ul>
					<Field label={`確認のため、ハンドル（${handle}）を入力してください`}>
						{(control) => (
							<TextInput
								{...control}
								autoComplete="off"
								value={typedHandle}
								onChange={(event) => setTypedHandle(event.target.value)}
							/>
						)}
					</Field>
					{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
					<div className={styles.actions}>
						<Button
							variant="danger"
							size="sm"
							status={action.status}
							successLabel="送りました"
							errorLabel="送れませんでした"
							disabled={typedHandle.trim() !== handle}
							onClick={() => void action.run(send)}
						>
							確認のメールを送る
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => {
								setStep("closed");
								setTypedHandle("");
								setErrorMessage(null);
							}}
						>
							やめる
						</Button>
					</div>
				</>
			) : null}

			{step === "sent" ? (
				<Note tone="success">
					確認のメールを送りました。メールのリンクを、このブラウザで開くと、アカウントが削除されます（1時間以内）。メールが届かないときは、しばらく待ってから、もう一度お試しください。リンクを開かなければ、何も削除されません。
				</Note>
			) : null}
		</section>
	);
}
