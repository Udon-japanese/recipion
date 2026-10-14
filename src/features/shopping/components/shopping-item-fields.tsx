import { Field, SelectBox } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import type { IngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { shoppingCategories } from "../domain/shopping-category";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-page.css";
import { ShoppingStoreSelect } from "./shopping-store-select";

// 候補の右に出す補足（カテゴリ名）。
export function describeCatalogEntry(
	entry: IngredientCatalogEntry,
): string | undefined {
	return shoppingCategories.find((category) => category.id === entry.categoryId)
		?.label;
}

type NameFieldProps = {
	label: string;
	hideLabel?: boolean;
	idPrefix?: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

// 買うものの名前（食材の候補つき）。
export function ShoppingNameField({
	label,
	hideLabel,
	name,
	value,
	onChange,
	placeholder,
}: NameFieldProps) {
	return (
		<Field label={label} hideLabel={hideLabel}>
			{(control) => (
				<IngredientNameInput
					className={fieldInput}
					id={control.id}
					name={name}
					value={value}
					onChange={onChange}
					placeholder={placeholder}
					describeEntry={describeCatalogEntry}
				/>
			)}
		</Field>
	);
}

type QuantityUnitFieldsProps = {
	quantity: string;
	onQuantityChange: (value: string) => void;
	unitLabel: string;
	onUnitChange: (value: string) => void;
	quantityName?: string;
	unitName?: string;
};

// 数量と単位（数量の下に、単位に合わせた押しボタン）。
export function ShoppingQuantityUnitFields({
	quantity,
	onQuantityChange,
	unitLabel,
	onUnitChange,
	quantityName,
	unitName,
}: QuantityUnitFieldsProps) {
	return (
		<div className={styles.two}>
			<div className={styles.grow}>
				<Field label="数量">
					{(control) => (
						<QuantityInput
							className={fieldInput}
							id={control.id}
							name={quantityName}
							value={quantity}
							onChange={onQuantityChange}
							unitLabel={unitLabel}
						/>
					)}
				</Field>
			</div>

			<div className={styles.unitField}>
				<Field label="単位">
					{(control) => (
						<input
							className={fieldInput}
							id={control.id}
							name={unitName}
							value={unitLabel}
							onChange={(event) => onUnitChange(event.target.value)}
							placeholder="個、袋、gなど"
							autoComplete="off"
						/>
					)}
				</Field>
			</div>
		</div>
	);
}

type CategoryFieldProps = {
	label: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
};

export function ShoppingCategoryField({
	label,
	name,
	value,
	onChange,
}: CategoryFieldProps) {
	return (
		<Field label={label}>
			{(control) => (
				<SelectBox
					id={control.id}
					name={name}
					value={value}
					onChange={(event) => onChange(event.target.value)}
				>
					<option value="">未設定</option>

					{shoppingCategories.map((category) => (
						<option value={category.id} key={category.id}>
							{category.label}
						</option>
					))}
				</SelectBox>
			)}
		</Field>
	);
}

type StoreFieldProps = {
	stores: readonly ShoppingStore[];
	value: string | null;
	onChange: (storeId: string | null) => void;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

export function ShoppingStoreField({
	stores,
	value,
	onChange,
	onCreateStore,
}: StoreFieldProps) {
	return (
		<Field label="買う店">
			{(control) => (
				<ShoppingStoreSelect
					id={control.id}
					stores={stores}
					value={value}
					onChange={onChange}
					onCreateStore={onCreateStore}
				/>
			)}
		</Field>
	);
}
