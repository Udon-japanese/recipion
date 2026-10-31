import { useEffect, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";
import * as styles from "./recipe-passphrase-section.css";

type RecipePassphraseSectionProps = {
	loadPassphrase: () => Promise<string | null>;
	regeneratePassphrase: () => Promise<string | null>;
};

// 限定公開のレシピの持ち主に出す、パスフレーズの表示と、作り直し（題名の下の、1行の帯）。
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
			<div className={styles.bar}>
				<div className={styles.text}>
					<span className={styles.label}>パスフレーズ</span>
					<span className={styles.passphrase} data-testid="passphrase">
						{passphrase ?? "…"}
					</span>
				</div>
				<div className={styles.actions}>
					<Button
						variant="secondary"
						size="sm"
						disabled={passphrase === null}
						onClick={() => void handleCopy()}
					>
						コピー
					</Button>
					<Button
						variant="ghost"
						size="sm"
						disabled={action.isPending}
						onClick={() => setIsConfirming(true)}
					>
						作り直す
					</Button>
				</div>
			</div>
			<p className={styles.note}>
				ログインしていて、このパスフレーズを知っている人だけが見られます。
			</p>
			{message ? <Note>{message}</Note> : null}

			<ConfirmDialog
				open={isConfirming}
				title="パスフレーズを作り直しますか？"
				cancelLabel="やめる"
				confirmLabel="作り直す"
				danger
				pending={action.isPending}
				onCancel={() => setIsConfirming(false)}
				onConfirm={() => void action.run(regenerate)}
			>
				これまでに開けた人も、新しいパスフレーズを入れないと見られなくなります。
			</ConfirmDialog>
		</section>
	);
}
