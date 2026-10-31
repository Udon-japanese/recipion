import { useEffect, useRef } from "react";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Field, SelectBox, TextInput } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import { Icon } from "#/components/icon/icon";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import type { InventoryTrackingMode } from "../../domain/apply-inventory-adjustment";
import { ExpiryFields } from "../expiry-fields";
import * as styles from "./registration-panel.css";
import {
	customUnitValue,
	type InventoryRegistration,
	toUnitValue,
} from "./use-inventory-registration";

const trackingOptions: readonly {
	value: InventoryTrackingMode;
	label: string;
}[] = [
	{ value: "estimated", label: "だいたい" },
	{ value: "exact", label: "正確" },
	{ value: "presence", label: "数えない" },
];

const trackingLabels: Record<InventoryTrackingMode, string> = {
	estimated: "だいたい",
	exact: "正確",
	presence: "数えない",
};

// 登録の本文（上から、よく使う順）。保存方法・期限の種類・数え方は、1行の要約にたたむ。
// 数え方は、カタログにある食材なら自動で決まる（塩・醤油などは「数えない」）。
function RegistrationForm({
	registration,
}: {
	registration: InventoryRegistration;
}) {
	const { ingredientName, stockUnit, unitOptions, unitChoice, trackingMode } =
		registration;
	const isPresence = trackingMode === "presence";
	const formRef = useRef<HTMLFormElement>(null);

	// 開いた直後に、食材名の欄へ。1件登録したあとも、続けて入力できるよう、食材名の欄へ戻す。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 件数が変わったときにも、戻す。
	useEffect(() => {
		const timer = window.setTimeout(() => {
			formRef.current
				?.querySelector<HTMLInputElement>('input[role="combobox"]')
				?.focus({ preventScroll: true });
		}, 0);

		return () => window.clearTimeout(timer);
	}, [registration.added.length]);

	return (
		<form
			className={styles.form}
			ref={formRef}
			onSubmit={registration.handleSubmit}
			noValidate
		>
			{/* Enter で追加できるように、見えない送信ボタンを置く。 */}
			<button type="submit" hidden />

			<Field label="食材名" hideLabel>
				{(control) => (
					<IngredientNameInput
						className={fieldInput}
						id={control.id}
						value={ingredientName}
						placeholder="玉ねぎ、塩など"
						onChange={registration.changeName}
					/>
				)}
			</Field>

			{isPresence ? null : (
				<Field label="数量">
					{(control) => (
						<QuantityInput
							className={fieldInput}
							id={control.id}
							value={registration.initialQuantity}
							onChange={registration.setInitialQuantity}
							unitLabel={stockUnit.stockUnitLabel}
							trailing={
								<div className={styles.unitSelect}>
									<SelectBox
										aria-label="在庫の単位"
										value={
											unitChoice === customUnitValue
												? customUnitValue
												: toUnitValue(stockUnit)
										}
										onChange={(event) =>
											registration.setUnitChoice(event.target.value)
										}
									>
										{unitOptions.map((option) => (
											<option
												value={toUnitValue(option)}
												key={toUnitValue(option)}
											>
												{option.stockUnitLabel}
											</option>
										))}
										{registration.isInCatalog ? null : (
											<option value={customUnitValue}>その他</option>
										)}
									</SelectBox>
								</div>
							}
						/>
					)}
				</Field>
			)}

			{!isPresence &&
			unitChoice === customUnitValue &&
			!registration.isInCatalog ? (
				<Field label="単位の呼び名">
					{(control) => (
						<TextInput
							{...control}
							value={registration.customUnitLabel}
							placeholder="パック、袋、本など"
							onChange={(event) =>
								registration.setCustomUnitLabel(event.target.value)
							}
						/>
					)}
				</Field>
			) : null}

			{!isPresence && registration.presets.length > 0 ? (
				<div className={styles.group}>
					<span className={styles.groupLabel} aria-hidden="true">
						よく使う数量
					</span>
					<ChipGroup label="よく使う数量">
						{registration.presets.map((preset) => (
							<Chip
								key={preset.label}
								onClick={() =>
									// 買った単位の数量を、在庫の単位に換算して、数量の欄に入れる。
									registration.setInitialQuantity(
										formatQuantity(
											preset.quantity *
												preset.inventoryConversion.stockQuantityPerInputUnit,
											{ grouping: false },
										),
									)
								}
							>
								{preset.label}
							</Chip>
						))}
					</ChipGroup>
				</div>
			) : null}

			<ExpiryFields
				value={registration.expiry}
				onChange={registration.changeExpiry}
				today={registration.today}
				disabled={registration.isSubmitting}
				detailsTitle="保存方法・期限・数え方"
				extraSummary={trackingLabels[trackingMode]}
				extraDetails={
					<div className={styles.group}>
						<span className={styles.groupLabel} aria-hidden="true">
							数え方
						</span>
						<SegmentedControl
							label="数え方"
							value={trackingMode}
							onChange={registration.changeTrackingMode}
							options={trackingOptions}
						/>
						{isPresence ? (
							<p className={styles.hint}>
								量は記録せず、あれば「足りている」とします。
							</p>
						) : null}
					</div>
				}
			/>

			{registration.added.length > 0 ? (
				<output className={styles.added}>
					<span className={styles.addedLabel}>入れたもの　</span>
					{registration.added.join("、")}
				</output>
			) : null}

			{registration.errorMessage ? (
				<p className={styles.error} role="alert">
					<Icon name="alert-triangle" size={20} />
					{registration.errorMessage}
				</p>
			) : null}
		</form>
	);
}

type InventoryRegistrationPanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	registration: InventoryRegistration;
};

// 買い物メモの追加と同じ、画面の上のカード。ボタンはカードの中に置く（キーボードが出ても、カードが縮んで、ボタンは見える）。
// 連続して登録できるよう、登録しても閉じない。入力は、閉じても残る（状態は、開く側が持つ）ので、Esc・暗幕でも閉じてよい。
export function InventoryRegistrationPanel({
	open,
	onOpenChange,
	registration,
}: InventoryRegistrationPanelProps) {
	const hasAdded = registration.added.length > 0;

	function close() {
		registration.resetSession();
		onOpenChange(false);
	}

	return (
		<CornerSheet
			open={open}
			title="在庫に追加"
			// 入力欄があるので、ボタンは、キーボードの下に隠れない、カードの中に置く。
			actions="inline"
			onDismiss={registration.isSubmitting ? undefined : close}
			left={{
				label: hasAdded ? "完了" : "閉じる",
				icon: hasAdded ? "check" : "close",
				onClick: close,
				disabled: registration.isSubmitting,
			}}
			right={{
				label: "追加",
				icon: "plus",
				pending: registration.isSubmitting,
				onClick: registration.submitCurrent,
			}}
		>
			<RegistrationForm registration={registration} />
		</CornerSheet>
	);
}
