import { IconButton } from "#/components/icon-button/icon-button";
import { parseRecipeYield, scaleRecipeYieldText } from "../domain/recipe-yield";
import * as styles from "./recipe-yield-stepper.css";

type RecipeYieldStepperProps = {
	// レシピのできあがりの量（「4人分」）。
	yieldText: string;
	// 見る人が選んだ数（なければ、レシピの量のまま）。
	wanted: number | undefined;
	// undefined は、レシピの量に戻す。
	onChange: (wanted: number | undefined) => void;
};

// 材料の見出しの横の「− 3人分 ＋」（量の文字を兼ねる）。量を変えているときだけ、元に戻すボタンを出す。
// 数は1ずつ変え、1より小さくはしない（リンクから開いた半端な数は、そのまま見せる）。
// 数のない量（作りやすい分量）のレシピでは、量の文字だけ。
export function RecipeYieldStepper({
	yieldText,
	wanted,
	onChange,
}: RecipeYieldStepperProps) {
	const recipeYield = parseRecipeYield(yieldText);

	if (!recipeYield) {
		return <span className={styles.value}>{yieldText}</span>;
	}

	const current = wanted ?? recipeYield.quantity;
	const isChanged = current !== recipeYield.quantity;
	const step = (delta: number) => {
		const next = Number((current + delta).toFixed(3));

		onChange(next === recipeYield.quantity ? undefined : next);
	};

	return (
		<span className={styles.container}>
			<span
				className={
					isChanged ? `${styles.pill} ${styles.pillChanged}` : styles.pill
				}
			>
				<IconButton
					icon="minus"
					label="量を減らす"
					tone="plain"
					iconSize={16}
					disabled={current - 1 < 1}
					onClick={() => step(-1)}
				/>
				<output className={styles.value} aria-live="polite">
					{scaleRecipeYieldText(yieldText, current / recipeYield.quantity)}
				</output>
				<IconButton
					icon="plus"
					label="量を増やす"
					tone="plain"
					iconSize={16}
					onClick={() => step(1)}
				/>
			</span>
			{isChanged ? (
				<IconButton
					icon="undo"
					label={`元の量（${yieldText}）に戻す`}
					tone="plain"
					iconSize={20}
					onClick={() => onChange(undefined)}
				/>
			) : null}
		</span>
	);
}
