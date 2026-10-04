import { useState } from "react";

type RecipeDeleteButtonProps = {
	onDelete: () => Promise<void>;
};

// 誤って消さないよう、「削除」を押したあとに、もう一度確認する（ブラウザの確認ダイアログは使わない）。
export function RecipeDeleteButton({ onDelete }: RecipeDeleteButtonProps) {
	const [step, setStep] = useState<"idle" | "confirming" | "deleting">("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleDelete() {
		setErrorMessage(null);
		setStep("deleting");

		try {
			await onDelete();
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "レシピを削除できませんでした",
			);
			setStep("confirming");
		}
	}

	if (step === "idle") {
		return (
			<button type="button" onClick={() => setStep("confirming")}>
				削除
			</button>
		);
	}

	return (
		<div>
			<p>このレシピを削除します。元に戻せません。</p>
			<button
				type="button"
				disabled={step === "deleting"}
				onClick={() => void handleDelete()}
			>
				{step === "deleting" ? "削除しています…" : "削除する"}
			</button>
			<button
				type="button"
				disabled={step === "deleting"}
				onClick={() => setStep("idle")}
			>
				キャンセル
			</button>

			{errorMessage ? <p role="alert">{errorMessage}</p> : null}
		</div>
	);
}
