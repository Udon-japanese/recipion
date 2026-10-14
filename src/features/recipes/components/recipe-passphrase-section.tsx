import { useEffect, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Card } from "#/components/card/card";
import { Note } from "#/components/note/note";
import * as styles from "./recipe-passphrase-section.css";

type RecipePassphraseSectionProps = {
	loadPassphrase: () => Promise<string | null>;
	regeneratePassphrase: () => Promise<string | null>;
};

// 限定公開のレシピの持ち主に出す、パスフレーズの表示と、作り直し。
export function RecipePassphraseSection({
	loadPassphrase,
	regeneratePassphrase,
}: RecipePassphraseSectionProps) {
	const [passphrase, setPassphrase] = useState<string | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);
	const action = useButtonAction();
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		let isCancelled = false;

		loadPassphrase()
			.then((value) => {
				if (!isCancelled) setPassphrase(value);
			})
			.catch(() => {
				if (!isCancelled) setMessage("パスフレーズを読み込めませんでした");
			});

		return () => {
			isCancelled = true;
		};
	}, [loadPassphrase]);

	async function regenerate() {
		setMessage(null);

		try {
			setPassphrase(await regeneratePassphrase());
			setIsConfirming(false);
			setMessage("パスフレーズを作り直しました。");

			return true;
		} catch {
			setMessage("作り直せませんでした。もう一度お試しください");

			return false;
		}
	}

	async function handleCopy() {
		if (passphrase === null) return;

		try {
			await navigator.clipboard.writeText(passphrase);
			setMessage("コピーしました。");
		} catch {
			setMessage("コピーできませんでした。選んでコピーしてください");
		}
	}

	return (
		<section className={styles.container} aria-label="限定公開のパスフレーズ">
			<Card padding="md">
				<div className={styles.body}>
					<h2 className={styles.title}>限定公開のパスフレーズ</h2>
					<p className={styles.note}>
						ログインした人のうち、このパスフレーズを知っている人だけが、このレシピを見られます。パスフレーズは、誰にでも伝えられます。漏れたと思ったら、作り直してください。
					</p>

					<p className={styles.passphrase} data-testid="passphrase">
						{passphrase ?? "…"}
					</p>

					<div className={styles.actions}>
						<Button
							variant="secondary"
							size="sm"
							disabled={passphrase === null}
							onClick={() => void handleCopy()}
						>
							コピー
						</Button>

						{isConfirming ? (
							<>
								<Button
									variant="danger"
									size="sm"
									status={action.status}
									successLabel="作り直しました"
									errorLabel="できませんでした"
									onClick={() => void action.run(regenerate)}
								>
									本当に作り直す
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setIsConfirming(false)}
								>
									やめる
								</Button>
							</>
						) : (
							<Button
								variant="secondary"
								size="sm"
								disabled={action.isPending}
								onClick={() => setIsConfirming(true)}
							>
								作り直す
							</Button>
						)}
					</div>

					{isConfirming ? (
						<p className={styles.note}>
							作り直すと、これまでに開けた人も、新しいパスフレーズを入れないと、見られなくなります。
						</p>
					) : null}
					{message ? <Note>{message}</Note> : null}
				</div>
			</Card>
		</section>
	);
}
