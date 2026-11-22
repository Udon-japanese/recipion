import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";
import { showToast } from "#/components/toast/toast-store";
import {
	buildUnlistedShareText,
	buildUnlistedShareUrl,
} from "../domain/unlisted-share-link";
import * as styles from "./recipe-passphrase-section.css";

type RecipePassphraseSectionProps = {
	recipeName: string;
	publicId: string;
	// 画面を出す前に取った、パスフレーズ（読めなかったときは null）。読み込み中の表示を挟まない。
	initialPassphrase: string | null;
	regeneratePassphrase: () => Promise<string | null>;
};

// 限定公開のレシピの持ち主に出す、パスフレーズの表示と、作り直し（題名の下の、1行の帯）。
export function RecipePassphraseSection({
	recipeName,
	publicId,
	initialPassphrase,
	regeneratePassphrase,
}: RecipePassphraseSectionProps) {
	const [passphrase, setPassphrase] = useState(initialPassphrase);
	const [isConfirming, setIsConfirming] = useState(false);
	const action = useButtonAction();
	// 失敗したとき（できたことは、画面の上のお知らせで伝える）。
	const [message, setMessage] = useState<string | null>(null);

	async function regenerate() {
		setMessage(null);

		try {
			setPassphrase(await regeneratePassphrase());
			setIsConfirming(false);
			showToast({
				id: "recipe-passphrase",
				message: "パスフレーズを作り直しました",
				icon: "check",
			});

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
			setMessage(null);
			showToast({
				id: "recipe-passphrase",
				message: "パスフレーズをコピーしました",
				icon: "check",
			});
		} catch {
			setMessage("コピーできませんでした。選んでコピーしてください");
		}
	}

	// 共有：Web Share API があれば、共有のシートを出す。なければ（PC の Firefox など）、リンクと文をコピーする。
	// リンクには、パスフレーズが入る（#p=…）。受け取った人は、ログインしていれば、そのまま開ける。
	async function handleShare() {
		if (passphrase === null) return;

		const url = buildUnlistedShareUrl(
			window.location.origin,
			publicId,
			passphrase,
		);
		const text = buildUnlistedShareText(recipeName, passphrase);
		const data = { title: recipeName, text, url };

		if (
			typeof navigator.share === "function" &&
			(navigator.canShare?.(data) ?? true)
		) {
			try {
				await navigator.share(data);
				setMessage(null);

				return;
			} catch (error) {
				// 利用者がやめた（AbortError）ときは、何もしない。ほかの失敗は、コピーに切り替える。
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
			}
		}

		try {
			await navigator.clipboard.writeText(`${text}\n${url}`);
			setMessage(null);
			showToast({
				id: "recipe-passphrase",
				message: "リンクをコピーしました",
				icon: "check",
			});
		} catch {
			setMessage(
				"共有できませんでした。パスフレーズをコピーして、送ってください",
			);
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
						variant="secondary"
						size="sm"
						disabled={passphrase === null}
						onClick={() => void handleShare()}
					>
						共有
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
				ログインしていて、このパスフレーズか、共有したリンクを知っている人だけが見られます。
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
				これまでに開けた人も、新しいパスフレーズを入れないと見られなくなります。共有したリンクも使えなくなります。
			</ConfirmDialog>
		</section>
	);
}
