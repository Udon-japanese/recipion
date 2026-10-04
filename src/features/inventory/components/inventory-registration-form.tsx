import { type SubmitEvent, useState } from "react";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import {
	parseRegisterInventoryItemInput,
	type RegisterInventoryItemInput,
} from "../application/register-inventory-item";
import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import type { InventoryUnitCode } from "../domain/inventory-unit";
import * as styles from "./inventory-registration-form.css";

type InventoryRegistrationFormProps = {
	registerInventoryItem: (
		input: RegisterInventoryItemInput,
	) => Promise<unknown>;
	onRegistered: () => void;
};

const stockUnitLabels: Record<InventoryUnitCode, string> = {
	count: "個",
	g: "g",
	ml: "ml",
};

// 買い物メモを経由せず、在庫に食材を直接登録する（塩・醤油のように、買った記録のない食材の登録など）。
export function InventoryRegistrationForm({
	registerInventoryItem,
	onRegistered,
}: InventoryRegistrationFormProps) {
	const [ingredientName, setIngredientName] = useState("");
	const [stockUnitCode, setStockUnitCode] = useState<InventoryUnitCode>("g");
	const [trackingMode, setTrackingMode] =
		useState<InventoryTrackingMode>("estimated");
	const [initialQuantity, setInitialQuantity] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	function handleNameChange(value: string) {
		setIngredientName(value);

		// カタログにある食材なら、在庫の単位と管理方法の初期値を入れる（あとから変更できる）。
		const entry = findIngredientCatalogEntry(value);

		if (entry) {
			setStockUnitCode(entry.stockUnitCode);
			setTrackingMode(entry.defaultTrackingMode);
		}
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		void submit(false);
	}

	// markAsAvailable が true のときは、数量を入れず、「ある」の目印だけを付ける（塩・醤油など）。
	async function submit(markAsAvailable: boolean) {
		if (isSubmitting) {
			return;
		}

		setErrorMessage(null);
		setSuccessMessage(null);

		let input: RegisterInventoryItemInput;

		try {
			input = parseRegisterInventoryItemInput({
				transactionId: crypto.randomUUID(),
				ingredientName,
				stockUnitCode,
				stockUnitLabel: stockUnitLabels[stockUnitCode],
				trackingMode,
				// 空欄は、数量なしで食材だけを登録する。
				initialQuantity:
					markAsAvailable || initialQuantity.trim() === ""
						? 0
						: Number(initialQuantity),
				markAsAvailable,
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "入力内容を確認してください",
			);

			return;
		}

		setIsSubmitting(true);

		try {
			await registerInventoryItem(input);

			setSuccessMessage(
				markAsAvailable
					? `${input.ingredientName}を「ある」で登録しました`
					: `${input.ingredientName}を在庫に追加しました`,
			);
			setIngredientName("");
			setInitialQuantity("");
			onRegistered();
		} catch {
			setErrorMessage("在庫に追加できませんでした。通信を確認してください");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit} noValidate>
			<h3 className={styles.heading}>在庫に直接追加</h3>

			<div className={styles.field}>
				<label className={styles.label} htmlFor="inventory-ingredient-name">
					食材名
				</label>
				<IngredientNameInput
					className={styles.input}
					id="inventory-ingredient-name"
					value={ingredientName}
					placeholder="塩、醤油、玉ねぎなど"
					onChange={handleNameChange}
				/>
			</div>

			<div className={styles.row}>
				<label className={styles.field}>
					<span className={styles.label}>在庫の単位</span>
					<select
						className={styles.input}
						value={stockUnitCode}
						onChange={(event) =>
							setStockUnitCode(event.target.value as InventoryUnitCode)
						}
					>
						<option value="count">個</option>
						<option value="g">g</option>
						<option value="ml">ml</option>
					</select>
				</label>

				<label className={styles.field}>
					<span className={styles.label}>管理方法</span>
					<select
						className={styles.input}
						value={trackingMode}
						onChange={(event) =>
							setTrackingMode(event.target.value as InventoryTrackingMode)
						}
					>
						<option value="estimated">だいたいで管理</option>
						<option value="exact">正確に管理</option>
					</select>
				</label>

				<label className={styles.field}>
					<span className={styles.label}>
						数量（{stockUnitLabels[stockUnitCode]}）
					</span>
					<input
						className={styles.input}
						type="number"
						inputMode="decimal"
						min="0"
						step="any"
						value={initialQuantity}
						onChange={(event) => setInitialQuantity(event.target.value)}
					/>
				</label>
			</div>

			<p className={styles.hint}>
				数量が空欄のときは、食材だけを登録します。塩や醤油のように、量を追わない食材は、「ある」を押してください（「少々」「適量」で使う食材は、在庫があれば「足りている」と判定します）。
			</p>

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{successMessage ? (
				<output className={styles.hint}>{successMessage}</output>
			) : null}

			<div className={styles.actions}>
				<button
					className={styles.availableButton}
					type="button"
					disabled={isSubmitting || ingredientName.trim() === ""}
					onClick={() => void submit(true)}
				>
					ある（量は追わない）
				</button>

				<button
					className={styles.submitButton}
					type="submit"
					disabled={isSubmitting || ingredientName.trim() === ""}
				>
					{isSubmitting ? "追加中…" : "在庫に追加"}
				</button>
			</div>
		</form>
	);
}
