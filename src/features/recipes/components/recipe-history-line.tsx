import {
	describeRecipeDates,
	formatRecipeDate,
	type RecipeCookStats,
	type RecipeDates,
} from "../domain/recipe-cook-log";
import * as styles from "./recipe-history-line.css";

type RecipeHistoryLineProps = {
	dates: RecipeDates;
	// 自分がつくった回数と最後の日（取れなかったときは、なし）。
	cookStats: RecipeCookStats | null;
};

// レシピの公開日（非公開は登録日）・更新日と、自分がつくった回数・最後につくった日。
export function RecipeHistoryLine({
	dates,
	cookStats,
}: RecipeHistoryLineProps) {
	return (
		<p className={styles.line}>
			{describeRecipeDates(dates).map((item) => (
				<span className={styles.item} key={item.label}>
					{`${item.label}：${item.date}`}
				</span>
			))}
			{cookStats && cookStats.count > 0 && cookStats.lastCookedAt ? (
				<span className={styles.item}>
					{`つくった：${cookStats.count}回（最後は${formatRecipeDate(cookStats.lastCookedAt)}）`}
				</span>
			) : null}
		</p>
	);
}
