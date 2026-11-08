import { useRef, useState } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import {
	formatRecipeYield,
	formatRecipeYieldQuantity,
	maxWantedYield,
	parseRecipeYield,
	parseWantedYieldInput,
} from "../domain/recipe-yield";
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
// 数は −／＋ で1ずつ変え、1より小さく、上限（maxWantedYield）より大きくはしない（リンクから開いた半端な数は、そのまま見せる）。
// 数の部分は入力欄で、打って変えることもできる（8個を16個に、など）。Enter か、欄から離れたときに確定し、Esc で取り消す。
// 数のない量（作りやすい分量）のレシピでは、量の文字だけ。
export function RecipeYieldStepper({
	yieldText,
	wanted,
	onChange,
}: RecipeYieldStepperProps) {
	// 打っている途中の文字（打っていないときは null）。打っている途中は、量を変えない。
	const [draft, setDraft] = useState<string | null>(null);
	// Esc で離れるときは、確定しない。
	const cancelsOnBlurRef = useRef(false);
	const recipeYield = parseRecipeYield(yieldText);

	if (!recipeYield) {
		return <span className={styles.value}>{yieldText}</span>;
	}

	const current = wanted ?? recipeYield.quantity;
	const isChanged = current !== recipeYield.quantity;
	const shownQuantity = Number(current.toFixed(2));
	const change = (next: number) => {
		onChange(next === recipeYield.quantity ? undefined : next);
	};
	const step = (delta: number) => change(Number((current + delta).toFixed(3)));
	// 読めない数・0 以下・上限を超える数は、確定せず、打つ前の数に戻す。
	const commit = (text: string) => {
		const next = parseWantedYieldInput(text);

		if (next !== null && next !== current) {
			change(next);
		}
	};
	const quantityText = draft ?? formatRecipeYieldQuantity(shownQuantity);

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
					tone="tint"
					iconSize={16}
					disabled={current - 1 < 1}
					onClick={() => step(-1)}
				/>
				<span className={`${styles.value} ${styles.editableValue}`}>
					{recipeYield.prefix}
					<input
						className={styles.quantityInput}
						type="text"
						inputMode="decimal"
						enterKeyHint="done"
						autoComplete="off"
						aria-label="できあがりの数"
						size={Math.max(1, quantityText.length)}
						value={quantityText}
						onFocus={(event) => {
							setDraft(event.currentTarget.value);
							event.currentTarget.select();
						}}
						onChange={(event) => setDraft(event.currentTarget.value)}
						onKeyDown={(event) => {
							// 変換中の Enter は、変換の確定（数の確定にしない）。
							if (event.nativeEvent.isComposing) {
								return;
							}

							if (event.key === "Enter") {
								event.preventDefault();
								event.currentTarget.blur();
							} else if (event.key === "Escape") {
								event.preventDefault();
								cancelsOnBlurRef.current = true;
								event.currentTarget.blur();
							}
						}}
						onBlur={() => {
							if (!cancelsOnBlurRef.current && draft !== null) {
								commit(draft);
							}

							cancelsOnBlurRef.current = false;
							setDraft(null);
						}}
					/>
					{recipeYield.suffix}
				</span>
				{/* 量が変わったことを、読み上げで伝える（見た目は、上の文字と入力欄）。 */}
				<output className={styles.visuallyHidden} aria-live="polite">
					{formatRecipeYield(recipeYield, shownQuantity)}
				</output>
				<IconButton
					icon="plus"
					label="量を増やす"
					tone="tint"
					iconSize={16}
					disabled={current + 1 > maxWantedYield}
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
