import { Field, SelectBox } from "#/components/field/field";
import { itemCategories } from "../domain/item-category";

// カテゴリの選択肢（未設定と、売り場の順のカテゴリ）。
export function ItemCategoryOptions() {
	return (
		<>
			<option value="">未設定</option>

			{itemCategories.map((category) => (
				<option value={category.id} key={category.id}>
					{category.label}
				</option>
			))}
		</>
	);
}

type ItemCategoryFieldProps = {
	label: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
};

export function ItemCategoryField({
	label,
	name,
	value,
	onChange,
	disabled,
}: ItemCategoryFieldProps) {
	return (
		<Field label={label}>
			{(control) => (
				<SelectBox
					id={control.id}
					name={name}
					value={value}
					disabled={disabled}
					onChange={(event) => onChange(event.target.value)}
				>
					<ItemCategoryOptions />
				</SelectBox>
			)}
		</Field>
	);
}
