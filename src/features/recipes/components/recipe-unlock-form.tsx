import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import * as styles from "./recipe-unlock-form.css";

type RecipeUnlockFormProps = {
	onUnlock: (passphrase: string) => Promise<"unlocked" | "wrong" | "locked">;
	onUnlocked: () => void;
};

// レシピが見つからないとき（存在しない・非公開・限定公開でまだ開けていない）に出す画面。どれなのかは、見分けがつかないようにしている。
export function RecipeUnlockForm({
	onUnlock,
	onUnlocked,
}: RecipeUnlockFormProps) {
	const [passphrase, setPassphrase] = useState("");
	const action = useButtonAction();
	const [message, setMessage] = useState<string | null>(null);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (passphrase.trim() === "") {
			setMessage("パスフレーズを入力してください");

			return;
		}

		void action.run(unlock);
	}

	async function unlock() {
		setMessage(null);

		try {
			const result = await onUnlock(passphrase);

			if (result === "unlocked") {
				onUnlocked();

				return true;
			}

			setMessage(
				result === "locked"
					? "間違いが続いたため、しばらく試せません。1時間ほど待ってから、お試しください。"
					: "パスフレーズが違うか、レシピが見つかりません。",
			);

			return false;
		} catch {
			setMessage("確認できませんでした。もう一度お試しください");

			return false;
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>レシピが見つかりません</h1>
			<p className={styles.note}>
				限定公開のレシピは、作者から教えてもらったパスフレーズを入力すると、見られます。
			</p>

			<form className={styles.form} onSubmit={handleSubmit}>
				<label htmlFor="recipe-passphrase">パスフレーズ</label>
				<input
					className={styles.input}
					id="recipe-passphrase"
					type="text"
					autoComplete="off"
					value={passphrase}
					onChange={(event) => setPassphrase(event.target.value)}
				/>
				{message ? (
					<p className={styles.message} role="alert">
						{message}
					</p>
				) : null}
				<Button
					type="submit"
					status={action.status}
					successLabel="開きます"
					errorLabel="開けません"
				>
					開く
				</Button>
			</form>
		</section>
	);
}
