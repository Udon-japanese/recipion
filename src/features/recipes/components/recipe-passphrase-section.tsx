import { useEffect, useState } from "react";
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
	const [isBusy, setIsBusy] = useState(false);
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

	async function handleRegenerate() {
		setIsBusy(true);
		setMessage(null);

		try {
			setPassphrase(await regeneratePassphrase());
			setIsConfirming(false);
			setMessage("パスフレーズを作り直しました。");
		} catch {
			setMessage("作り直せませんでした。もう一度お試しください");
		} finally {
			setIsBusy(false);
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
			<h2 className={styles.title}>限定公開のパスフレーズ</h2>
			<p className={styles.note}>
				ログインした人のうち、このパスフレーズを知っている人だけが、このレシピを見られます。パスフレーズは、誰にでも伝えられます。漏れたと思ったら、作り直してください。
			</p>

			<p className={styles.passphrase} data-testid="passphrase">
				{passphrase ?? "…"}
			</p>

			<div className={styles.actions}>
				<button
					className={styles.button}
					type="button"
					disabled={passphrase === null}
					onClick={() => void handleCopy()}
				>
					コピー
				</button>

				{isConfirming ? (
					<>
						<button
							className={`${styles.button} ${styles.dangerButton}`}
							type="button"
							disabled={isBusy}
							onClick={() => void handleRegenerate()}
						>
							本当に作り直す
						</button>
						<button
							className={styles.button}
							type="button"
							onClick={() => setIsConfirming(false)}
						>
							やめる
						</button>
					</>
				) : (
					<button
						className={styles.button}
						type="button"
						disabled={isBusy}
						onClick={() => setIsConfirming(true)}
					>
						作り直す
					</button>
				)}
			</div>

			{isConfirming ? (
				<p className={styles.note}>
					作り直すと、これまでに開けた人も、新しいパスフレーズを入れないと、見られなくなります。
				</p>
			) : null}
			{message ? <output className={styles.note}>{message}</output> : null}
		</section>
	);
}
