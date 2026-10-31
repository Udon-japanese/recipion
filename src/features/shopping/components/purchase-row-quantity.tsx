import { Chip, ChipGroup } from "#/components/chip/chip";
import { SelectBox, TextInput } from "#/components/field/field";
import { Menu } from "#/components/menu/menu";
import {
	type AmountDraft,
	applyAmountPreset,
	describeAmountTotal,
	listUnitOptions,
	otherUnitValue,
} from "../domain/amount-draft";
import type { ShoppingItem } from "../domain/shopping-item";
import { getShoppingItemPresets } from "../domain/shopping-item-suggestion";
import * as styles from "./purchase-conversion-sheet.css";

type PurchaseRowQuantityProps = {
	item: ShoppingItem;
	draft: AmountDraft;
	onChange: (draft: AmountDraft) => void;
	error: string | undefined;
	disabled: boolean;
};

// 「買った1つが、在庫でいくつになるか」を、数の欄と、単位のプルダウンで入れる（「300」「g」）。
// 候補（6個、など）があれば、ボタンで選べる。「量は数えない」は、右の「…」メニューから。
export function PurchaseRowQuantity({
	item,
	draft,
	onChange,
	error,
	disabled,
}: PurchaseRowQuantityProps) {
	const unit = item.unitLabel?.trim() || "つ";
	const presets = getShoppingItemPresets(item.name);
	const total = describeAmountTotal(item, draft);
	const unitOptions = listUnitOptions(item);
	const bought = draft.preset?.quantity ?? item.quantity;

	return (
		<div className={styles.quantity}>
			{presets.length > 0 ? (
				<ChipGroup label={`${item.name}の候補`}>
					{presets.map((preset) => (
						<Chip
							key={preset.label}
							pressed={
								draft.preset?.inventoryConversion === preset.inventoryConversion
							}
							disabled={disabled}
							onClick={() =>
								onChange(
									applyAmountPreset({
										quantity: preset.quantity,
										unitLabel: preset.unitLabel,
										inventoryConversion: preset.inventoryConversion,
									}),
								)
							}
						>
							{preset.label}
						</Chip>
					))}
				</ChipGroup>
			) : null}

			<div className={styles.askLine}>
				{draft.isPresence ? (
					<p className={styles.result}>
						量は数えない（あるか、ないかだけ見ます）
					</p>
				) : (
					<>
						<label className={styles.askWord} htmlFor={`amount-${item.id}`}>
							1{unit}は
						</label>
						<div className={styles.numberInput}>
							<TextInput
								id={`amount-${item.id}`}
								inputMode="decimal"
								placeholder={draft.unit === "g" ? "例：300" : undefined}
								aria-label={`${item.name}の1${unit}あたりの数`}
								aria-invalid={error ? true : undefined}
								value={draft.quantityText}
								disabled={disabled}
								onChange={(event) =>
									onChange({
										...draft,
										quantityText: event.target.value,
										preset: undefined,
									})
								}
							/>
						</div>

						<div className={styles.unitSelect}>
							<SelectBox
								aria-label={`${item.name}の在庫で使う単位`}
								value={draft.unit}
								disabled={disabled || unitOptions.length === 1}
								onChange={(event) =>
									onChange({
										...draft,
										unit: event.target.value,
										preset: undefined,
									})
								}
							>
								{unitOptions.map((option) => (
									<option value={option.value} key={option.value}>
										{option.label}
									</option>
								))}
							</SelectBox>
						</div>

						{draft.unit === otherUnitValue ? (
							<div className={styles.labelInput}>
								<TextInput
									aria-label={`${item.name}の単位`}
									placeholder="例：束、玉"
									value={draft.customUnit}
									disabled={disabled}
									onChange={(event) =>
										onChange({
											...draft,
											customUnit: event.target.value,
											preset: undefined,
										})
									}
								/>
							</div>
						) : null}

						{total ? (
							<span className={styles.total}>
								{bought}
								{unit} ＝ {total}
							</span>
						) : null}
					</>
				)}

				<div className={styles.rowMenu}>
					<Menu
						label={`${item.name}のその他`}
						icon="more-horizontal"
						items={[
							{
								label: draft.isPresence ? "量を数える" : "量は数えない",
								icon: "swap",
								onSelect: () =>
									onChange({
										...draft,
										isPresence: !draft.isPresence,
										preset: undefined,
									}),
							},
						]}
					/>
				</div>
			</div>

			{error ? (
				<p className={styles.rowError} role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
