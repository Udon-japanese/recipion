import {
	type ReactNode,
	type SubmitEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import { Chip } from "#/components/chip/chip";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
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
import {
	ShoppingCategoryField,
	ShoppingNameField,
	ShoppingQuantityUnitFields,
	ShoppingStoreField,
} from "./shopping-item-fields";
import * as styles from "./shopping-page.css";

type ShoppingItemFormProps = {
	// 追加する。成功したら true（入力欄を空に戻す）。失敗したときのエラーは、呼び出し側が表示する。
	onAdd: (input: CreateShoppingItemInput) => Promise<boolean>;
	errorMessage: string | null;
	stores: readonly ShoppingStore[];
	// 食材名に対して、いつも買う店（なければ null）。
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	submitLabel?: string;
	// 常に、数量やカテゴリの欄まで開いておく（条件つきのメモの作成など）。
	alwaysExpanded?: boolean;
	// 追加ボタンの上に足す欄（条件つきのメモの「どんな時に」など）。
	children?: ReactNode;
};

// 買い物メモへ、商品を追加するフォーム。
export function ShoppingItemForm({
	onAdd,
	errorMessage,
	stores,
	defaultStoreIdFor,
	onCreateStore,
	submitLabel = "追加",
	alwaysExpanded = false,
	children,
}: ShoppingItemFormProps) {
	const formRef = useRef<HTMLFormElement>(null);
	// 名前の欄に触れたら、数量などの欄を開く（空のまま外を押す・Esc で閉じる）。
	const [isOpened, setIsOpened] = useState(false);
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unitLabel, setUnitLabel] = useState("");
	const [inventoryConversion, setInventoryConversion] =
		useState<ShoppingItemInventoryConversion | null>(null);
	const [categoryId, setCategoryId] = useState<ShoppingCategoryId | "">("");
	const [isCategoryManuallySelected, setIsCategoryManuallySelected] =
		useState(false);
	const [storeId, setStoreId] = useState<string | null>(null);
	// 店を自分で選んだら、名前の入力で「いつも買う店」を入れ直さない。
	const [isStoreChosen, setIsStoreChosen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const presets = getShoppingItemPresets(name);
	const isExpanded = alwaysExpanded || isOpened || name !== "";

	useEffect(() => {
		if (!isOpened) {
			return;
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target as Element;

			if (
				!formRef.current?.contains(target) &&
				!target.closest('[role="dialog"], [role="listbox"], [role="menu"]')
			) {
				setIsOpened(false);
			}
		}

		document.addEventListener("pointerdown", handlePointerDown);

		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [isOpened]);

	function handleNameChange(value: string) {
		setName(value);
		setInventoryConversion(null);

		if (!isCategoryManuallySelected) {
			setCategoryId(inferShoppingCategory(value) ?? "");
		}

		if (!isStoreChosen) {
			setStoreId(defaultStoreIdFor(value));
		}
	}

	function handleCategoryChange(value: string) {
		setCategoryId(isShoppingCategoryId(value) ? value : "");
		setIsCategoryManuallySelected(true);
	}

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);

		try {
			const added = await onAdd({
				name,
				quantity: parseQuantityInput(quantity) ?? Number.NaN,
				unitLabel,
				inventoryConversion,
				categoryId: categoryId || null,
				categoryAssignment: categoryId
					? isCategoryManuallySelected
						? "manual"
						: "automatic"
					: null,
				storeId,
			});

			if (added) {
				setStoreId(null);
				setIsStoreChosen(false);
				setName("");
				setQuantity("1");
				setUnitLabel("");
				setCategoryId("");
				setIsCategoryManuallySelected(false);
				setInventoryConversion(null);
				// 続けて入れられるように、名前の欄へ戻る。
				formRef.current
					?.querySelector<HTMLInputElement>('input[role="combobox"]')
					?.focus();
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			className={styles.addForm}
			data-expanded={isExpanded}
			ref={formRef}
			onSubmit={(event) => void handleSubmit(event)}
			onFocus={() => setIsOpened(true)}
			onKeyDown={(event) => {
				if (event.key === "Escape" && name === "" && !alwaysExpanded) {
					setIsOpened(false);
				}
			}}
		>
			<div className={styles.addNameRow}>
				<div className={styles.grow}>
					<ShoppingNameField
						label="買うもの"
						hideLabel={!isExpanded}
						name="name"
						value={name}
						onChange={handleNameChange}
						placeholder={isExpanded ? "卵、牛乳など" : "例：牛乳"}
					/>
				</div>

				{isExpanded ? null : (
					<IconButton
						icon="plus"
						label="追加"
						size="std"
						tone="on"
						type="submit"
						disabled={isSubmitting}
					/>
				)}
			</div>

			{isExpanded ? (
				<>
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

					{presets.length > 0 ? (
						<fieldset className={styles.groupLabel}>
							<legend className={styles.groupLegend}>よく使う数量</legend>

							<div className={styles.chips}>
								{presets.map((preset) => (
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
								))}
							</div>
						</fieldset>
					) : null}

					<ShoppingCategoryField
						label="カテゴリ"
						name="categoryId"
						value={categoryId}
						onChange={handleCategoryChange}
					/>

					<ShoppingStoreField
						stores={stores}
						value={storeId}
						onChange={(next) => {
							setStoreId(next);
							setIsStoreChosen(true);
						}}
						onCreateStore={onCreateStore}
					/>

					{children}

					<Button size="lg" fullWidth type="submit" disabled={isSubmitting}>
						{submitLabel}
					</Button>
				</>
			) : null}

			{errorMessage ? (
				<p className={styles.formError} role="alert">
					<Icon name="alert-triangle" size={20} />
					{errorMessage}
				</p>
			) : null}
		</form>
	);
}
