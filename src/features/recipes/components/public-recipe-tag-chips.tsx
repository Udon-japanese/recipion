import { Chip, ChipGroup } from "#/components/chip/chip";
import {
	type PublicRecipeTag,
	publicRecipeTagCategories,
} from "../domain/recipe-tags";
import * as styles from "./public-recipe-tag-chips.css";

type PublicRecipeTagChipsProps = {
	selected: readonly PublicRecipeTag[];
	onToggle: (tag: PublicRecipeTag) => void;
	// 上限に達したとき、選んでいないチップを押せなくする。
	max: number;
};

// 公開用のタグの語の一覧を、分類ごとにたためる形で並べる（選んだタグがある分類は、開いておく）。
export function PublicRecipeTagChips({
	selected,
	onToggle,
	max,
}: PublicRecipeTagChipsProps) {
	const isFull = selected.length >= max;

	return (
		<div>
			{publicRecipeTagCategories.map((category) => {
				const selectedCount = category.tags.filter(([tag]) =>
					selected.includes(tag),
				).length;

				return (
					<details
						key={category.label}
						className={styles.category}
						open={selectedCount > 0 ? true : undefined}
					>
						<summary className={styles.summary}>
							{category.label}
							{selectedCount > 0 ? (
								<span className={styles.count}>（{selectedCount}）</span>
							) : null}
						</summary>
						<ChipGroup label={category.label}>
							{category.tags.map(([tag, label]) => {
								const pressed = selected.includes(tag);

								return (
									<Chip
										key={tag}
										pressed={pressed}
										disabled={!pressed && isFull}
										onClick={() => onToggle(tag)}
									>
										{label}
									</Chip>
								);
							})}
						</ChipGroup>
					</details>
				);
			})}
		</div>
	);
}
