import { type SubmitEvent, useEffect, useMemo, useState } from "react";
import * as v from "valibot";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
	type IngredientPurchasePreset,
} from "#/features/ingredients/domain/ingredient-catalog";
import {
	listStockUnitOptions,
	type StockUnitOption,
} from "#/features/ingredients/domain/list-stock-unit-options";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	parseRegisterInventoryItemInput,
	type RegisterInventoryItemInput,
} from "../application/register-inventory-item";
import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import {
	buildExpiryPrefill,
	type IngredientExpiryDefaults,
} from "../domain/build-expiry-prefill";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";
import { toDateString } from "../domain/inventory-lot";
import { inventoryTrackingModeSchema } from "../domain/inventory-tracking-mode";
import {
	getLearnedRemainingDays,
	recordExpiryHint,
} from "../infrastructure/expiry-hints-storage";
import {
	ExpiryFields,
	type ExpiryFieldsValue,
	emptyExpiryFields,
	toLotInput,
} from "./expiry-fields";
import * as styles from "./inventory-registration-form.css";

type InventoryRegistrationFormProps = {
	registerInventoryItem: (
		input: RegisterInventoryItemInput,
	) => Promise<unknown>;
	onRegistered: () => void;
	// 期限の目安の自動入力のレベル（省略は「確実なものだけ」）。
	expiryEstimateLevel?: ExpiryEstimateLevel;
	// ユーザーが決めた、食材の期限の種類・保存方法（初期値として使う）。
	lookupIngredientDefaults?: (
		ingredientName: string,
	) => IngredientExpiryDefaults | null;
};

const customUnitValue = "custom";

function toUnitValue(option: StockUnitOption): string {
	return `${option.stockUnitCode}:${option.stockUnitLabel}`;
}

// 買い物メモを経由せず、在庫に食材を直接登録する（塩・醤油のように、買った記録のない食材の登録など）。
export function InventoryRegistrationForm({
	registerInventoryItem,
	onRegistered,
	expiryEstimateLevel = "reliable",
	lookupIngredientDefaults,
}: InventoryRegistrationFormProps) {
	const [ingredientName, setIngredientName] = useState("");
	// 在庫の単位の選択（"g:g" の形。マスタにない食材は、"custom"＝自分で入力した呼び名の個数）。
	const [unitChoice, setUnitChoice] = useState("g:g");
	const [customUnitLabel, setCustomUnitLabel] = useState("");
	const [trackingMode, setTrackingMode] =
		useState<InventoryTrackingMode>("estimated");
	const [initialQuantity, setInitialQuantity] = useState("");
	const [expiry, setExpiry] = useState<ExpiryFieldsValue>(emptyExpiryFields);
	// ユーザーが期限の欄を触ったら、食材名を変えても、目安で上書きしない。
	const [isExpiryTouched, setIsExpiryTouched] = useState(false);
	const [presets, setPresets] = useState<readonly IngredientPurchasePreset[]>(
		[],
	);
	// クイック入力の基準になる、今日（日本時間）。
	const today = useMemo(() => toDateString(new Date()), []);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// 食材名・目安の設定が変わったとき、期限の欄（触っていなければ）に、目安を入れ直す。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 食材名と設定が変わったときだけ、入れ直す。
	useEffect(() => {
		if (isExpiryTouched) {
			return;
		}

		setExpiry(
			ingredientName.trim() === ""
				? emptyExpiryFields
				: buildExpiryPrefill({
						ingredientName,
						acquiredOn: today,
						level: expiryEstimateLevel,
						learnedRemainingDays: getLearnedRemainingDays(ingredientName),
						userDefaults: lookupIngredientDefaults?.(ingredientName) ?? null,
					}),
		);
	}, [ingredientName, expiryEstimateLevel, lookupIngredientDefaults, today]);

	function handleNameChange(value: string) {
		setIngredientName(value);

		// カタログにある食材なら、在庫の単位と管理方法の初期値を入れる（あとから変更できる）。
		const entry = findIngredientCatalogEntry(value);

		const nextOptions = listStockUnitOptions(value);

		if (entry) {
			setUnitChoice(
				toUnitValue({
					stockUnitCode: entry.stockUnitCode,
					stockUnitLabel: getDefaultStockUnitLabel(entry.stockUnitCode),
				}),
			);
			setTrackingMode(entry.defaultTrackingMode);
		} else if (
			unitChoice !== customUnitValue &&
			!nextOptions.some((option) => toUnitValue(option) === unitChoice)
		) {
			setUnitChoice(
				toUnitValue(
					nextOptions[0] ?? { stockUnitCode: "g", stockUnitLabel: "g" },
				),
			);
		}

		// カタログにある食材の、買うときの数量（数量ボタン）。
		setPresets(entry?.presets ?? []);
	}

	// マスタにある単位だけを、選べる。マスタにない食材は、自分で呼び名を入力することもできる。
	const isInCatalog = findIngredientCatalogEntry(ingredientName) !== undefined;
	const unitOptions = listStockUnitOptions(ingredientName);
	const stockUnit: StockUnitOption =
		unitChoice === customUnitValue
			? {
					stockUnitCode: "count",
					stockUnitLabel: customUnitLabel.trim() || "個",
				}
			: (unitOptions.find((option) => toUnitValue(option) === unitChoice) ??
				unitOptions[0] ?? { stockUnitCode: "g", stockUnitLabel: "g" });

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		// 管理方法が「有無だけ」なら、数量はなく、「ある」で登録する。
		void submit(trackingMode === "presence");
	}

	// markAsAvailable が true のときは、数量を入れず、「ある」（有無だけ）で登録する（塩・醤油など）。
	async function submit(markAsAvailable: boolean) {
		if (isSubmitting) {
			return;
		}

		setErrorMessage(null);
		setSuccessMessage(null);

		// 数量が、数として読めないとき（負の数、文字など）は、送らない。
		if (
			!markAsAvailable &&
			initialQuantity.trim() !== "" &&
			parseQuantityInput(initialQuantity) === null
		) {
			setErrorMessage("数量を確認してください（例：2、0.5、1/2）");

			return;
		}

		let input: RegisterInventoryItemInput;

		try {
			input = parseRegisterInventoryItemInput({
				transactionId: crypto.randomUUID(),
				ingredientName,
				stockUnitCode: stockUnit.stockUnitCode,
				stockUnitLabel: stockUnit.stockUnitLabel,
				trackingMode,
				// 空欄は、数量なしで食材だけを登録する。
				initialQuantity:
					markAsAvailable || initialQuantity.trim() === ""
						? 0
						: (parseQuantityInput(initialQuantity) ?? Number.NaN),
				markAsAvailable,
				lot: toLotInput(expiry),
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
			// 入力した期限（目安ではないもの）は、次の目安のために、覚える。
			if (expiry.expirySource === "entered" && expiry.expiresOn !== "") {
				recordExpiryHint({
					ingredientName: input.ingredientName,
					acquiredOn: today,
					expiresOn: expiry.expiresOn,
					storage: expiry.storage === "" ? null : expiry.storage,
				});
			}

			setExpiry(emptyExpiryFields);
			setIsExpiryTouched(false);
			setPresets([]);
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
						value={
							unitChoice === customUnitValue
								? customUnitValue
								: toUnitValue(stockUnit)
						}
						onChange={(event) => setUnitChoice(event.target.value)}
					>
						{unitOptions.map((option) => (
							<option value={toUnitValue(option)} key={toUnitValue(option)}>
								{option.stockUnitLabel}
							</option>
						))}
						{isInCatalog ? null : (
							<option value={customUnitValue}>その他（自分で入力）</option>
						)}
					</select>
				</label>

				{unitChoice === customUnitValue && !isInCatalog ? (
					<label className={styles.field}>
						<span className={styles.label}>単位の呼び名</span>
						<input
							className={styles.input}
							value={customUnitLabel}
							placeholder="パック、袋、本など"
							onChange={(event) => setCustomUnitLabel(event.target.value)}
						/>
					</label>
				) : null}

				<label className={styles.field}>
					<span className={styles.label}>管理方法</span>
					<select
						className={styles.input}
						value={trackingMode}
						onChange={(event) =>
							setTrackingMode(
								v.parse(inventoryTrackingModeSchema, event.target.value),
							)
						}
					>
						<option value="estimated">だいたいで管理</option>
						<option value="exact">正確に管理</option>
						<option value="presence">有無だけ（量は追わない）</option>
					</select>
				</label>

				{trackingMode !== "presence" ? (
					<div className={styles.field}>
						<label
							className={styles.label}
							htmlFor="inventory-initial-quantity"
						>
							数量（{stockUnit.stockUnitLabel}）
						</label>
						<QuantityInput
							className={styles.input}
							id="inventory-initial-quantity"
							value={initialQuantity}
							onChange={setInitialQuantity}
							unitLabel={stockUnit.stockUnitLabel}
						/>
					</div>
				) : null}
			</div>

			{trackingMode !== "presence" && presets.length > 0 ? (
				<fieldset className={styles.presets}>
					<legend className={styles.label}>よく使う数量</legend>
					<div className={styles.presetList}>
						{presets.map((preset) => (
							<button
								className={styles.presetButton}
								type="button"
								key={preset.label}
								onClick={() =>
									// 買った単位の数量を、在庫の単位に換算して、数量の欄に入れる。
									setInitialQuantity(
										formatQuantity(
											preset.quantity *
												preset.inventoryConversion.stockQuantityPerInputUnit,
											{ grouping: false },
										),
									)
								}
							>
								{preset.label}
							</button>
						))}
					</div>
				</fieldset>
			) : null}

			<ExpiryFields
				idPrefix="inventory-registration"
				value={expiry}
				onChange={(value) => {
					setExpiry(value);
					setIsExpiryTouched(true);
				}}
				today={today}
				disabled={isSubmitting}
			/>

			<p className={styles.hint}>
				数量が空欄のときは、食材だけを登録します。塩や醤油のように、量を追わない食材は、「ある」を押してください（管理方法が「有無だけ」になり、レシピの量にかかわらず、在庫があれば「足りている」と判定します）。
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
