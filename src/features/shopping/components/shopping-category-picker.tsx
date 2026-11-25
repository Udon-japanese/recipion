import { Icon } from "#/components/icon/icon";
import { PickerSelect } from "#/components/select/picker-select";
import { ItemCategoryOptions } from "#/features/item-category/components/item-category-field";
import {
	type ItemCategoryId,
	isItemCategoryId,
} from "#/features/item-category/domain/item-category";
import * as styles from "./shopping-add-sheet.css";

type ShoppingCategoryPickerProps = {
	value: ItemCategoryId | "";
	// 自分で選んだか（選んでいなければ、名前から自動で決めた印を出す）。
	isManual: boolean;
	// 自分で選んだとき。
	onChange: (categoryId: ItemCategoryId | "") => void;
	name?: string;
};

// 買い物メモの項目のカテゴリ。行そのものが選択の欄で、押すと、すぐ一覧（スマホはシート）が開く。
// 追加・編集のシートと、条件つきのメモの材料で共通。
export function ShoppingCategoryPicker({
	value,
	isManual,
	onChange,
	name,
}: ShoppingCategoryPickerProps) {
	return (
		<div className={styles.category}>
			<span className={styles.categoryKey}>カテゴリ</span>
			<span className={styles.categoryPicker}>
				<PickerSelect
					aria-label="カテゴリ"
					name={name}
					className={styles.categorySelect}
					value={value}
					onChange={(event) => {
						const categoryId = event.target.value;

						onChange(isItemCategoryId(categoryId) ? categoryId : "");
					}}
				>
					<ItemCategoryOptions />
				</PickerSelect>
				<span className={styles.categoryChevron} aria-hidden="true">
					<Icon name="chevron-down" size={16} />
				</span>
			</span>
			{value && !isManual ? <span className={styles.auto}>自動</span> : null}
		</div>
	);
}
