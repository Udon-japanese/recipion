import { DishCoverView } from "#/features/dish-art/components/dish-cover-view";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import * as styles from "./recipe-thumbnail.css";

type RecipeThumbnailProps = {
	cover: DishPlacement[] | null;
	// 絵を付けていないときの、れしぽよの絵を決める種（レシピの識別子）。
	publicId: string;
};

// 一覧の行の先頭に置く、レシピの小さな絵。
export function RecipeThumbnail({ cover, publicId }: RecipeThumbnailProps) {
	return (
		<span className={styles.thumbnail}>
			<DishCoverView cover={cover} seed={publicId} size={48} />
		</span>
	);
}
