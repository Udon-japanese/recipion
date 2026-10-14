import { useEffect, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, SelectBox, TextInput } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { IconButton } from "#/components/icon-button/icon-button";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { useMediaQuery } from "#/components/use-media-query";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { formatShortDate, storageLabels } from "../../domain/expiry-labels";
import {
	getLotZone,
	type InventoryZoneId,
} from "../../domain/inventory-fridge";
import { ExpiryFields, type ExpiryFieldsValue } from "../expiry-fields";
import * as styles from "./registration-panel.css";
import {
	customUnitValue,
	type InventoryRegistration,
	toUnitValue,
} from "./use-inventory-registration";

const zoneIcons: Record<InventoryZoneId, IconName> = {
	fridge: "zone-fridge",
	door: "zone-door",
	vegetable: "zone-vegetable",
	freezer: "zone-freezer",
	table: "zone-table",
};

const nameInputId = "inventory-ingredient-name";

// たたんだ行に出す、期限・保存方法の要約（例：「冷蔵・約 10/16」）。
function summarizeExpiry(value: ExpiryFieldsValue): string {
	const parts: string[] = [];

	if (value.storage !== "") {
		parts.push(storageLabels[value.storage]);
	}

	if (value.expiresOn !== "") {
		parts.push(
			`${value.expirySource === "estimated" ? "約 " : ""}${formatShortDate(value.expiresOn)}`,
		);
	}

	return parts.length > 0 ? parts.join("・") : "未設定";
}

type FormBodyProps = {
	registration: InventoryRegistration;
	onOpenSettings: () => void;
};

// 登録のパネルの本文（上から、よく使う順）。
function RegistrationFormBody({ registration, onOpenSettings }: FormBodyProps) {
	const [isExpiryOpen, setIsExpiryOpen] = useState(false);
	const {
		ingredientName,
		stockUnit,
		unitOptions,
		unitChoice,
		trackingMode,
		expiry,
	} = registration;

	// 開いた直後に、食材名の欄へ。1件登録したあとも、続けて入力できるよう、食材名の欄へ戻す。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 件数が変わったときにも、戻す。
	useEffect(() => {
		const timer = window.setTimeout(() => {
			document.getElementById(nameInputId)?.focus({ preventScroll: true });
		}, 0);

		return () => window.clearTimeout(timer);
	}, [registration.addedCount]);

	const zone = getLotZone(
		{
			name: ingredientName,
			trackingMode,
			defaultStorage: null,
		},
		{ storage: expiry.storage === "" ? null : expiry.storage },
	);

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

			<div className={styles.fieldGroup}>
				<span className={styles.label}>管理方法</span>
				<SegmentedControl
					label="管理方法"
					value={trackingMode}
					onChange={registration.changeTrackingMode}
					options={[
						{ value: "estimated", label: "だいたい" },
						{ value: "exact", label: "正確" },
						{ value: "presence", label: "有無だけ" },
					]}
				/>
			</div>

			<Field label="在庫の単位">
				{(control) => (
					<SelectBox
						{...control}
						value={
							unitChoice === customUnitValue
								? customUnitValue
								: toUnitValue(stockUnit)
						}
						onChange={(event) => registration.setUnitChoice(event.target.value)}
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
				)}
			</Field>

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

			{trackingMode !== "presence" ? (
				<div className={styles.fieldGroup}>
					<label className={styles.label} htmlFor="inventory-initial-quantity">
						数量（{stockUnit.stockUnitLabel}）
					</label>
					<div className={styles.quantityLine}>
						<QuantityInput
							className={fieldInput}
							id="inventory-initial-quantity"
							value={registration.initialQuantity}
							onChange={registration.setInitialQuantity}
							unitLabel={stockUnit.stockUnitLabel}
						/>
					</div>
					<p className={styles.hint}>
						数量が空欄のときは、食材だけを登録します。塩や醤油のように、量を追わない食材は、「ある」を押してください（管理方法が「有無だけ」になり、レシピの量にかかわらず、在庫があれば「足りている」と判定します）。
					</p>
				</div>
			) : (
				<p className={styles.hint}>
					塩や醤油のように、量を追わない食材です。「ある」を押すと、在庫があれば「足りている」と判定します。
				</p>
			)}

			{trackingMode !== "presence" && registration.presets.length > 0 ? (
				<div className={styles.fieldGroup}>
					<span className={styles.label}>よく使う数量</span>
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
													preset.inventoryConversion.stockQuantityPerInputUnit,
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
				</div>
			) : null}

			<div className={styles.expiryBlock}>
				<div className={styles.expiryHeader}>
					<button
						className={styles.expiryRow}
						type="button"
						aria-expanded={isExpiryOpen}
						aria-controls="inventory-registration-expiry"
						onClick={() => setIsExpiryOpen((open) => !open)}
					>
						<Icon name={zoneIcons[zone]} size={20} />
						<span className={styles.expiryTitle}>期限・保存方法</span>
						<span className={styles.expirySummary}>
							{summarizeExpiry(expiry)}
						</span>
						<span className={styles.chevron}>
							<Icon name="chevron-down" size={20} />
						</span>
					</button>
					<IconButton
						icon="sliders"
						label="期限の目安の設定"
						size="std"
						tone="plain"
						onClick={onOpenSettings}
					/>
				</div>

				{isExpiryOpen ? (
					<div className={styles.expiryBody} id="inventory-registration-expiry">
						<ExpiryFields
							value={expiry}
							onChange={registration.changeExpiry}
							today={registration.today}
							disabled={registration.isSubmitting}
						/>
					</div>
				) : null}
			</div>
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
					variant="secondary"
					status={registration.availableAction.status}
					successLabel="登録しました"
					errorLabel="登録できません"
					disabled={registration.isSubmitting || isBlank}
					onClick={() =>
						void registration.availableAction.run(() =>
							registration.submit(true),
						)
					}
				>
					ある（量は追わない）
				</Button>

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

type InventoryRegistrationPanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	registration: InventoryRegistration;
	onOpenSettings: () => void;
};

// 在庫に追加するパネル（スマホ＝下からのシート、1024px〜＝右のパネル）。
// 連続して登録できるよう、登録しても閉じない。入力は、閉じても残る（状態は、開く側が持つ）。
export function InventoryRegistrationPanel({
	open,
	onOpenChange,
	registration,
	onOpenSettings,
}: InventoryRegistrationPanelProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title="在庫に追加"
			placement={isRight ? "right" : "bottom"}
			snapPoints={[0.92]}
			headerTrailing={
				registration.addedCount > 0 ? (
					<Tag tone="success" icon="check">
						<span aria-hidden>{registration.addedCount}</span>
						<span className={styles.srOnly}>
							追加した件数 {registration.addedCount}
						</span>
					</Tag>
				) : null
			}
			footer={<RegistrationFooter registration={registration} />}
		>
			<RegistrationFormBody
				registration={registration}
				onOpenSettings={onOpenSettings}
			/>
		</Sheet>
	);
}
