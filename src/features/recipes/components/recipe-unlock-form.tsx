import { type SubmitEvent, useEffect, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Field, TextInput } from "#/components/field/field";
import * as styles from "./recipe-unlock-form.css";

type RecipeUnlockFormProps = {
	onUnlock: (passphrase: string) => Promise<"unlocked" | "wrong" | "locked">;
	onUnlocked: () => void;
	// 共有リンク（#p=…）で受け取ったパスフレーズを、1回だけ取り出す。あれば、入れて、そのまま開く。
	takeSharedPassphrase?: () => string | null;
};

// レシピが見つからないとき（存在しない・非公開・限定公開でまだ開けていない）に出す画面。どれなのかは、見分けがつかないようにしている。
export function RecipeUnlockForm({
	onUnlock,
	onUnlocked,
	takeSharedPassphrase,
}: RecipeUnlockFormProps) {
	const [passphrase, setPassphrase] = useState("");
	const action = useButtonAction();
	const [message, setMessage] = useState<string | null>(null);

	// 共有リンクで開いたとき：URL のフラグメントは、ブラウザでしか読めないので、描画のあとに取り出す。
	// 取り出すと消えるので、2回目の実行（StrictMode など）では、何もしない。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 開いたときに、1回だけ試す。
	useEffect(() => {
		const shared = takeSharedPassphrase?.();

		if (shared) {
			setPassphrase(shared);
			void action.run(() => unlock(shared));
		}
	}, []);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (passphrase.trim() === "") {
			setMessage("パスフレーズを入力してください");

			return;
		}

		void action.run(() => unlock(passphrase));
	}

	async function unlock(value: string) {
		setMessage(null);

		try {
			const result = await onUnlock(value);

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
				<Field label="パスフレーズ" error={message}>
					{(control) => (
						<TextInput
							{...control}
							type="text"
							autoComplete="off"
							value={passphrase}
							onChange={(event) => setPassphrase(event.target.value)}
						/>
					)}
				</Field>
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
