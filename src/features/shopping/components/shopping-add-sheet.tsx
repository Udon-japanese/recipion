import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip } from "#/components/chip/chip";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Icon } from "#/components/icon/icon";
import {
	formatQuantity,
	formatQuantityForUnit,
} from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
	shoppingCategories,
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
import * as styles from "./shopping-add-sheet.css";
import {
	ShoppingCategoryField,
	ShoppingNameField,
	ShoppingQuantityUnitFields,
} from "./shopping-item-fields";
import { ShoppingStoreChips } from "./shopping-store-chips";

type ShoppingAddSheetProps = {
	title: string;
	// 追加する。成功したら true（入力を空に戻して、続けて入れられる）。失敗したときのエラーは、errorMessage で表示する。
	onAdd: (input: CreateShoppingItemInput) => Promise<boolean>;
	errorMessage?: string | null;
	stores: readonly ShoppingStore[];
	// 食材名に対して、いつも買う店（なければ null）。
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onClose: () => void;
};

// 数量の単位の候補がないとき（食材のよく使う数量が、ないとき）に並べる、よく使う単位。
const commonUnits = ["個", "本", "パック", "袋", "g"] as const;

// 買い物メモへ、1つずつ（続けて）入れる。画面の上のカード＋下の角のボタン。
// 追加しても閉じず、入力は空に戻る。店は、前回のまま続ける（店ごとに回って買うときに楽）。
export function ShoppingAddSheet({
	title,
	onAdd,
	errorMessage = null,
	stores,
	defaultStoreIdFor,
	onCreateStore,
	onClose,
}: ShoppingAddSheetProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unitLabel, setUnitLabel] = useState("");
	const [inventoryConversion, setInventoryConversion] =
		useState<ShoppingItemInventoryConversion | null>(null);
	const [categoryId, setCategoryId] = useState<ShoppingCategoryId | "">("");
	const [isCategoryManual, setIsCategoryManual] = useState(false);
	const [isChangingCategory, setIsChangingCategory] = useState(false);
	const [storeId, setStoreId] = useState<string | null>(null);
	// 店を自分で選んだら、名前の入力で「いつも買う店」を入れ直さない。
	const [isStoreChosen, setIsStoreChosen] = useState(false);
	// 前回の店（名前に「いつも買う店」がないときに、続ける）。
	const [carriedStoreId, setCarriedStoreId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isNameMissing, setIsNameMissing] = useState(false);
	// 入れたもの（このシートを開いてから）。
	const [added, setAdded] = useState<string[]>([]);

	const presets = getShoppingItemPresets(name);
	const categoryLabel = shoppingCategories.find(
		(category) => category.id === categoryId,
	)?.label;

	function focusNameField() {
		formRef.current
			?.querySelector<HTMLInputElement>('input[role="combobox"]')
			?.focus();
	}

	// 開いたら、すぐ名前を打てるようにする。
	useEffect(() => {
		formRef.current
			?.querySelector<HTMLInputElement>('input[role="combobox"]')
			?.focus();
	}, []);

	function handleNameChange(value: string) {
		setName(value);
		setIsNameMissing(false);
		setInventoryConversion(null);

		if (!isCategoryManual) {
			setCategoryId(inferShoppingCategory(value) ?? "");
		}

		if (!isStoreChosen) {
			setStoreId(defaultStoreIdFor(value) ?? carriedStoreId);
		}
	}

	function handleStoreChange(next: string | null) {
		setStoreId(next);
		setIsStoreChosen(true);
		setCarriedStoreId(next);
	}

	async function handleSubmit() {
		if (name.trim() === "") {
			setIsNameMissing(true);
			focusNameField();

			return;
		}

		setIsSubmitting(true);

		try {
			const parsedQuantity = parseQuantityInput(quantity);
			const isAdded = await onAdd({
				name,
				quantity: parsedQuantity ?? Number.NaN,
				unitLabel,
				inventoryConversion,
				categoryId: categoryId || null,
				categoryAssignment: categoryId
					? isCategoryManual
						? "manual"
						: "automatic"
					: null,
				storeId,
			});

			if (isAdded) {
				setAdded((current) => [
					...current,
					`${name.trim()} ${formatQuantityForUnit(parsedQuantity ?? 1, unitLabel || null)}${unitLabel}`,
				]);
				setCarriedStoreId(storeId);
				setName("");
				setQuantity("1");
				setUnitLabel("");
				setCategoryId("");
				setIsCategoryManual(false);
				setIsChangingCategory(false);
				setInventoryConversion(null);
				setIsStoreChosen(false);
				// 続けて入れられるように、名前の欄へ戻る（店は、前回のまま）。
				focusNameField();
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<CornerSheet
			open
			title={title}
			// 入力欄があるので、ボタンは、キーボードの下に隠れない、カードの中に置く。
			actions="inline"
			// 打ちかけの入力を、うっかり消さないよう、空のときだけ、Esc と暗幕で閉じる。
			onDismiss={name === "" && !isSubmitting ? onClose : undefined}
			// 1つも入れていないなら、「完了」ではなく「閉じる」。
			left={{
				label: added.length > 0 ? "完了" : "閉じる",
				icon: added.length > 0 ? "check" : "close",
				onClick: onClose,
				disabled: isSubmitting,
			}}
			right={{
				label: "追加",
				icon: "plus",
				pending: isSubmitting,
				onClick: () => void handleSubmit(),
			}}
		>
			<form
				className={styles.form}
				ref={formRef}
				onSubmit={(event) => {
					event.preventDefault();
					void handleSubmit();
				}}
			>
				{/* Enter で追加できるように、見えない送信ボタンを置く。 */}
				<button type="submit" hidden />

				<ShoppingNameField
					label="買うもの"
					hideLabel
					name="name"
					value={name}
					onChange={handleNameChange}
					placeholder="卵、牛乳など"
				/>

				<ShoppingQuantityUnitFields
					quantity={quantity}
					onQuantityChange={setQuantity}
					unitLabel={unitLabel}
					onUnitChange={(value) => {
						setUnitLabel(value);
						setInventoryConversion(null);
					}}
					quantityName="quantity"
					unitName="unitLabel"
				/>

				<fieldset className={styles.group}>
					<legend className={styles.groupLabel}>
						{presets.length > 0 ? "よく使う数量" : "よく使う単位"}
					</legend>

					<div className={styles.chips}>
						{presets.length > 0
							? presets.map((preset) => (
									<Chip
										pressed={isShoppingItemPresetSelected(preset, {
											quantity,
											unitLabel,
											inventoryConversion,
										})}
										key={preset.label}
										onClick={() => {
											setQuantity(
												formatQuantity(preset.quantity, { grouping: false }),
											);
											setUnitLabel(preset.unitLabel);
											setInventoryConversion(preset.inventoryConversion);
										}}
									>
										{preset.label}
									</Chip>
								))
							: commonUnits.map((unit) => (
									<Chip
										pressed={unitLabel === unit}
										key={unit}
										onClick={() => {
											setUnitLabel(unit);
											setInventoryConversion(null);
										}}
									>
										{unit}
									</Chip>
								))}
					</div>
				</fieldset>

				<ShoppingStoreChips
					stores={stores}
					value={storeId}
					onChange={handleStoreChange}
					onCreateStore={onCreateStore}
				/>

				<div className={styles.category}>
					<span className={styles.categoryKey}>カテゴリ</span>
					<span className={styles.categoryValue}>
						{categoryLabel ?? "未設定"}
					</span>
					{categoryId && !isCategoryManual ? (
						<span className={styles.auto}>自動</span>
					) : null}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsChangingCategory((current) => !current)}
					>
						{isChangingCategory ? "閉じる" : categoryId ? "変える" : "選ぶ"}
					</Button>
				</div>

				{isChangingCategory ? (
					<ShoppingCategoryField
						label="カテゴリ"
						name="categoryId"
						value={categoryId}
						onChange={(value) => {
							setCategoryId(isShoppingCategoryId(value) ? value : "");
							setIsCategoryManual(true);
						}}
					/>
				) : null}

				{added.length > 0 ? (
					<output className={styles.added}>
						<span className={styles.addedLabel}>入れたもの　</span>
						{added.join("、")}
					</output>
				) : null}

				{isNameMissing ? (
					<p className={styles.error} role="alert">
						<Icon name="alert-triangle" size={20} />
						買うものを入力してください
					</p>
				) : null}

				{errorMessage ? (
					<p className={styles.error} role="alert">
						<Icon name="alert-triangle" size={20} />
						{errorMessage}
					</p>
				) : null}
			</form>
		</CornerSheet>
	);
}
