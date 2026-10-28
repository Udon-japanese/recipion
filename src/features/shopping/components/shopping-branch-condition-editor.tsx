import { useState } from "react";
import { Chip } from "#/components/chip/chip";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Field, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	defaultShoppingBranchCondition,
	maxShoppingBranchConditionLength,
	maxShoppingBranchLabelLength,
} from "../domain/shopping-branch";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
} from "../domain/shopping-category";
import type {
	CreateShoppingItemInput,
	ShoppingItemInventoryConversion,
} from "../domain/shopping-item";
import {
	getShoppingItemPresets,
	inferShoppingCategory,
	isShoppingItemPresetSelected,
} from "../domain/shopping-item-suggestion";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-branch-condition-editor.css";
import {
	ShoppingCategoryField,
	ShoppingNameField,
	ShoppingQuantityUnitFields,
	ShoppingStoreField,
} from "./shopping-item-fields";

export type BranchConditionValue = {
	storeId: string | null;
	name: string;
	// 入力中の文字（数量は、入力のまま持つ）。
	quantity: string;
	unitLabel: string;
	categoryId: ShoppingCategoryId | "";
	// カテゴリを、自分で選んだか（選んでいなければ、名前から自動で決める）。
	isCategoryManual: boolean;
	// 「よく使う数量」を選んだときだけ（在庫への換算つき）。選ばなければ、null。
	presetConversion: ShoppingItemInventoryConversion | null;
	// どんな時に（売っていたら・安ければ）。
	condition: string;
	// 「そうなら」「そうでなければ」の呼び名（省略できる）。
	thenLabel: string;
	elseLabel: string;
};

type ConditionPart = "store" | "name" | "amount" | "condition";

// 何も入れていない、作りはじめの値。
export const emptyBranchConditionValue: BranchConditionValue = {
	storeId: null,
	name: "",
	quantity: "1",
	unitLabel: "",
	categoryId: "",
	isCategoryManual: false,
	presetConversion: null,
	condition: defaultShoppingBranchCondition,
	thenLabel: "",
	elseLabel: "",
};

// 入力を、条件の材料の入力にする（数量が読めなければ NaN にして、検証で止める）。
export function toConditionItemInput(draft: BranchConditionValue) {
	return {
		name: draft.name,
		quantity: parseQuantityInput(draft.quantity) ?? Number.NaN,
		unitLabel: draft.unitLabel,
		inventoryConversion: draft.presetConversion ?? undefined,
		categoryId: draft.categoryId || null,
		categoryAssignment: draft.categoryId
			? draft.isCategoryManual
				? "manual"
				: "automatic"
			: null,
		storeId: draft.storeId,
	} satisfies CreateShoppingItemInput;
}

type ShoppingBranchConditionEditorProps = {
	// 新しく作るか、直すか（見出し・保存のボタン・最初に開く入力が変わる）。
	mode?: "create" | "edit";
	// 開くたびに、新しく作る（開いていないときは、描画しない）。
	value: BranchConditionValue;
	stores: readonly ShoppingStore[];
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onCancel: () => void;
	// 保存できたら true（閉じるのは、呼ぶ側）。
	onSave: (value: BranchConditionValue) => Promise<boolean>;
};

// 条件を直す：いまの設定を文章で見せ、直したい部分（店・材料・数量・どんな時に）を押すと、その入力だけが開く。
// 上のカード＋角のボタン（キャンセル／保存）。
export function ShoppingBranchConditionEditor({
	mode = "edit",
	value,
	stores,
	onCreateStore,
	onCancel,
	onSave,
}: ShoppingBranchConditionEditorProps) {
	const [draft, setDraft] = useState(value);
	// 作るときは、まず材料から入れる。
	const [part, setPart] = useState<ConditionPart | null>(
		mode === "create" ? "name" : null,
	);
	const [isSaving, setIsSaving] = useState(false);
	const storeName = stores.find((store) => store.id === draft.storeId)?.name;
	const amount = `${draft.quantity}${draft.unitLabel}`.trim();
	const isCreate = mode === "create";
	const presets = getShoppingItemPresets(draft.name);
	const isValid = draft.name.trim() !== "" && draft.condition.trim() !== "";

	function update(patch: Partial<BranchConditionValue>) {
		setDraft({ ...draft, ...patch });
	}

	function handleNameChange(name: string) {
		update({
			name,
			categoryId: draft.isCategoryManual
				? draft.categoryId
				: (inferShoppingCategory(name) ?? ""),
		});
	}

	function togglePart(next: ConditionPart) {
		setPart(part === next ? null : next);
	}

	async function handleSave() {
		setIsSaving(true);

		try {
			await onSave(draft);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<CornerSheet
			open
			title={isCreate ? "条件つきのメモを作る" : "条件を直す"}
			onDismiss={isSaving ? undefined : onCancel}
			left={{
				label: "キャンセル",
				icon: "close",
				disabled: isSaving,
				onClick: onCancel,
			}}
			right={{
				label: isCreate ? "作る" : "保存",
				icon: "check",
				disabled: !isValid,
				pending: isSaving,
				onClick: () => void handleSave(),
			}}
		>
			<div className={styles.preview} aria-live="polite">
				<p className={styles.previewTitle}>こう動きます</p>
				<p className={styles.previewCondition}>
					{`${storeName ? `${storeName}に` : ""}${draft.name || "（材料）"}${amount ? ` ${amount}` : ""}が${draft.condition}…`}
				</p>
				<p className={styles.previewSide}>
					<Icon name="check-circle" size={16} />
					{`そうなら：${draft.thenLabel || "（呼び名なし）"}`}
				</p>
				<p className={styles.previewSide}>
					<Icon name="ban-circle" size={16} />
					{`そうでなければ：${draft.elseLabel || "（呼び名なし）"}`}
				</p>
			</div>

			<fieldset className={styles.group}>
				<legend className={styles.groupLabel}>何が、どうなったら</legend>
				<div className={styles.sentence}>
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "store"}
						onClick={() => togglePart("store")}
					>
						{storeName ? (
							<>
								{storeName}
								<span className={styles.tokenSub}>店</span>
							</>
						) : (
							<span className={styles.tokenEmpty}>店を選ぶ</span>
						)}
					</button>
					{storeName ? <span className={styles.joshi}>に</span> : null}
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "name"}
						onClick={() => togglePart("name")}
					>
						{draft.name || <span className={styles.tokenEmpty}>材料</span>}
					</button>
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "amount"}
						onClick={() => togglePart("amount")}
					>
						{amount || <span className={styles.tokenEmpty}>数量</span>}
					</button>
					<span className={styles.joshi}>が</span>
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "condition"}
						onClick={() => togglePart("condition")}
					>
						{draft.condition || (
							<span className={styles.tokenEmpty}>どんな時に</span>
						)}
					</button>
				</div>

				{part ? (
					<div className={styles.editor}>
						{part === "store" ? (
							<ShoppingStoreField
								stores={stores}
								value={draft.storeId}
								onChange={(storeId) => update({ storeId })}
								onCreateStore={onCreateStore}
							/>
						) : null}
						{part === "name" ? (
							<ShoppingNameField
								label="材料"
								value={draft.name}
								onChange={handleNameChange}
							/>
						) : null}
						{part === "amount" ? (
							<>
								<ShoppingQuantityUnitFields
									quantity={draft.quantity}
									onQuantityChange={(quantity) => update({ quantity })}
									unitLabel={draft.unitLabel}
									onUnitChange={(unitLabel) =>
										update({ unitLabel, presetConversion: null })
									}
								/>
								{presets.length > 0 ? (
									<fieldset className={styles.presets}>
										<legend className={styles.groupLabel}>よく使う数量</legend>
										<div className={styles.chips}>
											{presets.map((preset) => (
												<Chip
													key={preset.label}
													pressed={isShoppingItemPresetSelected(preset, {
														quantity: draft.quantity,
														unitLabel: draft.unitLabel,
														inventoryConversion: draft.presetConversion,
													})}
													onClick={() =>
														update({
															quantity: formatQuantity(preset.quantity, {
																grouping: false,
															}),
															unitLabel: preset.unitLabel,
															presetConversion: preset.inventoryConversion,
														})
													}
												>
													{preset.label}
												</Chip>
											))}
										</div>
									</fieldset>
								) : null}
							</>
						) : null}
						{part === "condition" ? (
							<Field label="どんな時に" hint="例：売っていたら、安ければ">
								{(control) => (
									<TextInput
										{...control}
										value={draft.condition}
										maxLength={maxShoppingBranchConditionLength}
										onChange={(event) =>
											update({ condition: event.target.value })
										}
										autoComplete="off"
									/>
								)}
							</Field>
						) : null}
					</div>
				) : (
					<p className={styles.joshi}>
						{isCreate
							? "入れたい部分を押してください。"
							: "直したい部分を押してください。"}
					</p>
				)}
			</fieldset>

			<fieldset className={styles.group}>
				<legend className={styles.groupLabel}>
					2つの場合の呼び名（省略できます）
				</legend>
				<div className={styles.pair}>
					<Field label="そうなら">
						{(control) => (
							<TextInput
								{...control}
								value={draft.thenLabel}
								maxLength={maxShoppingBranchLabelLength}
								placeholder="例：ハンバーグ"
								onChange={(event) => update({ thenLabel: event.target.value })}
								autoComplete="off"
							/>
						)}
					</Field>
					<Field label="そうでなければ">
						{(control) => (
							<TextInput
								{...control}
								value={draft.elseLabel}
								maxLength={maxShoppingBranchLabelLength}
								placeholder="例：生姜焼き"
								onChange={(event) => update({ elseLabel: event.target.value })}
								autoComplete="off"
							/>
						)}
					</Field>
				</div>
			</fieldset>

			<details className={styles.advanced}>
				<summary className={styles.advancedSummary}>
					くわしい設定（カテゴリ）
				</summary>
				<div className={styles.advancedBody}>
					<ShoppingCategoryField
						label="カテゴリ"
						value={draft.categoryId}
						onChange={(next) =>
							update({
								categoryId: isShoppingCategoryId(next) ? next : "",
								isCategoryManual: true,
							})
						}
					/>
				</div>
			</details>
		</CornerSheet>
	);
}
