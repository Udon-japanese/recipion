import { useEffect, useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, SelectBox, TextInput } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import {
	FloatingPanel,
	floatingPanelWidth,
	type PanelPosition,
} from "#/components/floating-panel/floating-panel";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { Toggle } from "#/components/toggle/toggle";
import { useMediaQuery } from "#/components/use-media-query";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { ExpiryFields } from "../expiry-fields";
import * as expiryStyles from "../expiry-fields.css";
import * as styles from "./registration-panel.css";
import {
	customUnitValue,
	type InventoryRegistration,
	toUnitValue,
} from "./use-inventory-registration";

const nameInputId = "inventory-ingredient-name";

type FormBodyProps = {
	registration: InventoryRegistration;
	onOpenSettings: () => void;
};

// 登録のパネルの本文（上から、よく使う順。数え方は、たたんでおく）。
function RegistrationFormBody({ registration, onOpenSettings }: FormBodyProps) {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const detailsId = useId();
	const { ingredientName, stockUnit, unitOptions, unitChoice, trackingMode } =
		registration;
	const isPresence = trackingMode === "presence";

	// 開いた直後に、食材名の欄へ。1件登録したあとも、続けて入力できるよう、食材名の欄へ戻す。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 件数が変わったときにも、戻す。
	useEffect(() => {
		const timer = window.setTimeout(() => {
			document.getElementById(nameInputId)?.focus({ preventScroll: true });
		}, 0);

		return () => window.clearTimeout(timer);
	}, [registration.addedCount]);

	return (
		<form
			id="inventory-registration-form"
			className={styles.form}
			onSubmit={registration.handleSubmit}
			noValidate
		>
			<div className={styles.fieldGroup}>
				<label className={styles.label} htmlFor={nameInputId}>
					食材名
				</label>
				<IngredientNameInput
					className={fieldInput}
					id={nameInputId}
					value={ingredientName}
					placeholder="塩、醤油、玉ねぎなど"
					onChange={registration.changeName}
				/>
			</div>

			<div className={styles.switchRow}>
				<span className={styles.switchText}>
					<span className={styles.label}>量は数えない</span>
					<span className={styles.hint}>
						塩や醤油など。在庫があれば「足りている」と判定します
					</span>
				</span>
				<Toggle
					label="量は数えない"
					checked={isPresence}
					onChange={(checked) =>
						registration.changeTrackingMode(checked ? "presence" : "estimated")
					}
				/>
			</div>

			{isPresence ? null : (
				<div className={styles.fieldGroup}>
					<label className={styles.label} htmlFor="inventory-initial-quantity">
						数量（{stockUnit.stockUnitLabel}）
					</label>
					<div className={styles.quantityLine}>
						<div className={styles.quantityMain}>
							<QuantityInput
								className={fieldInput}
								id="inventory-initial-quantity"
								value={registration.initialQuantity}
								onChange={registration.setInitialQuantity}
								unitLabel={stockUnit.stockUnitLabel}
							/>
						</div>
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
									<option value={toUnitValue(option)} key={toUnitValue(option)}>
										{option.stockUnitLabel}
									</option>
								))}
								{registration.isInCatalog ? null : (
									<option value={customUnitValue}>その他（自分で入力）</option>
								)}
							</SelectBox>
						</div>
					</div>

					{unitChoice === customUnitValue && !registration.isInCatalog ? (
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

					{registration.presets.length > 0 ? (
						<ChipGroup label="よく使う数量">
							<div className={styles.presetList}>
								{registration.presets.map((preset) => (
									<Chip
										key={preset.label}
										onClick={() =>
											// 買った単位の数量を、在庫の単位に換算して、数量の欄に入れる。
											registration.setInitialQuantity(
												formatQuantity(
													preset.quantity *
														preset.inventoryConversion
															.stockQuantityPerInputUnit,
													{ grouping: false },
												),
											)
										}
									>
										{preset.label}
									</Chip>
								))}
							</div>
						</ChipGroup>
					) : null}
				</div>
			)}

			<div className={styles.fieldGroup}>
				<div className={styles.expiryHeader}>
					<span className={styles.label}>期限</span>
					<IconButton
						icon="sliders"
						label="期限の目安の設定"
						size="std"
						tone="plain"
						onClick={onOpenSettings}
					/>
				</div>

				<ExpiryFields
					value={registration.expiry}
					onChange={registration.changeExpiry}
					today={registration.today}
					disabled={registration.isSubmitting}
				/>
			</div>

			{isPresence ? null : (
				<div className={styles.fieldGroup}>
					<button
						className={expiryStyles.detailsToggle}
						type="button"
						aria-expanded={isDetailsOpen}
						aria-controls={detailsId}
						onClick={() => setIsDetailsOpen((open) => !open)}
					>
						<span className={expiryStyles.detailsTitle}>数え方</span>
						<span className={expiryStyles.detailsSummary}>
							{trackingMode === "exact" ? "正確" : "だいたい"}
						</span>
						<span className={expiryStyles.chevron} data-open={isDetailsOpen}>
							<Icon name="chevron-down" size={20} />
						</span>
					</button>

					{isDetailsOpen ? (
						<div id={detailsId}>
							<SegmentedControl
								label="数え方"
								value={trackingMode}
								onChange={registration.changeTrackingMode}
								options={[
									{ value: "estimated", label: "だいたい" },
									{ value: "exact", label: "正確" },
								]}
							/>
						</div>
					) : null}
				</div>
			)}
		</form>
	);
}

// 下に固定する操作バー。結果の文（残す）と失敗の文を、ボタンの上に置く。
function RegistrationFooter({
	registration,
}: {
	registration: InventoryRegistration;
}) {
	const isBlank = registration.ingredientName.trim() === "";

	return (
		<div className={styles.footer}>
			{registration.successMessage ? (
				<output className={styles.result}>{registration.successMessage}</output>
			) : null}

			{registration.errorMessage ? (
				<p className={styles.error} role="alert">
					{registration.errorMessage}
				</p>
			) : null}

			<div className={styles.bar}>
				<Button
					type="submit"
					form="inventory-registration-form"
					status={registration.submitAction.status}
					pendingLabel="追加中"
					successLabel="追加しました"
					errorLabel="追加できません"
					disabled={registration.isSubmitting || isBlank}
				>
					在庫に追加
				</Button>
			</div>
		</div>
	);
}

// 動かした位置（画面を開いている間、覚える）。
let lastPosition: PanelPosition | null = null;

type InventoryRegistrationPanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	registration: InventoryRegistration;
	onOpenSettings: () => void;
};

// 連続して登録できるよう、登録しても閉じない。入力は、閉じても残る（状態は、開く側が持つ）。
export function InventoryRegistrationPanel({
	open,
	onOpenChange,
	registration,
	onOpenSettings,
}: InventoryRegistrationPanelProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");
	const trailing =
		registration.addedCount > 0 ? (
			<Tag tone="success" icon="check">
				<span aria-hidden>{registration.addedCount}</span>
				<span className={styles.srOnly}>
					追加した件数 {registration.addedCount}
				</span>
			</Tag>
		) : null;
	const footer = <RegistrationFooter registration={registration} />;
	const form = (
		<RegistrationFormBody
			registration={registration}
			onOpenSettings={onOpenSettings}
		/>
	);

	// 広い画面：自由に動かせる浮いたパネル。続けて何件も追加できるよう、動かした位置は覚えておく。
	if (isRight) {
		return open ? (
			<FloatingPanel
				title="在庫に追加"
				headerTrailing={trailing}
				footer={footer}
				getInitialPosition={() =>
					lastPosition ?? {
						x: window.innerWidth - floatingPanelWidth - 32,
						y: window.innerHeight - 640,
					}
				}
				onMove={(position) => {
					lastPosition = position;
				}}
				onEscape={() => onOpenChange(false)}
				onClose={() => onOpenChange(false)}
			>
				{form}
			</FloatingPanel>
		) : null;
	}

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title="在庫に追加"
			placement="bottom"
			// 浮いたパネル：後ろの在庫を見ながら、続けて登録できる。スマホは、見出しだけの低い位置・半分・ほぼ全面に止まる。
			modal={false}
			snapPoints={[0.6, 0.92]}
			defaultSnapIndex={0}
			headerTrailing={trailing}
			footer={footer}
		>
			{form}
		</Sheet>
	);
}
