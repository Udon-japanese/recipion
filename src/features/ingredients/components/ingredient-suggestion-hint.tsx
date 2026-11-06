import { useMemo, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { describeError } from "#/errors/user-facing-error";
import {
	findSimilarIngredients,
	type SimilarIngredient,
} from "../domain/find-similar-ingredients";
import {
	useIngredientDictionaryActions,
	useIngredientDictionaryContext,
} from "./ingredient-dictionary-context";
import * as styles from "./ingredient-suggestion-hint.css";

type IngredientSuggestionHintProps = {
	// 入力した（本文に書いた）材料名。
	name: string;
	// 入力欄の名前を、候補の名前に置き換える（入力欄の下に置くときだけ。本文は書き換えないので、プレビューでは渡さない）。
	onReplace?: (name: string) => void;
};

// 「もしかして：〇〇？」。知らない名前（カタログにも、自分の辞書にもない）に、似ている材料を出す。
// ［同じ材料にする］は、入力した名前を、その材料の呼び名として辞書に足す（文字は変えない）。ゲストには出さない。
export function IngredientSuggestionHint({
	name,
	onReplace,
}: IngredientSuggestionHintProps) {
	const dictionary = useIngredientDictionaryContext();
	const { mergeNames } = useIngredientDictionaryActions();
	const suggestions = useMemo(
		() => findSimilarIngredients(name, dictionary),
		[name, dictionary],
	);

	if (suggestions.length === 0) {
		return null;
	}

	return (
		<ul className={styles.list} aria-label={`${name}に似ている材料`}>
			{suggestions.map((suggestion) => (
				<SuggestionRow
					key={suggestion.name}
					name={name}
					suggestion={suggestion}
					onReplace={onReplace}
					mergeNames={mergeNames}
				/>
			))}
		</ul>
	);
}

function SuggestionRow({
	name,
	suggestion,
	onReplace,
	mergeNames,
}: {
	name: string;
	suggestion: SimilarIngredient;
	onReplace?: (name: string) => void;
	mergeNames?: (sourceName: string, targetName: string) => Promise<void>;
}) {
	const action = useButtonAction();
	const [message, setMessage] = useState<string | null>(null);

	return (
		<li className={styles.row}>
			<span className={styles.text}>
				もしかして：<strong>{suggestion.name}</strong>？
			</span>
			<span className={styles.actions}>
				{onReplace ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onReplace(suggestion.name)}
					>
						{suggestion.name}にする
					</Button>
				) : null}
				{mergeNames ? (
					<Button
						variant="secondary"
						size="sm"
						status={action.status}
						pendingLabel="まとめています"
						aria-label={`${name}を${suggestion.name}と同じ材料にする`}
						onClick={() =>
							void action.run(async () => {
								try {
									await mergeNames(name, suggestion.name);
									setMessage(null);
								} catch (error) {
									setMessage(describeError(error, "まとめられませんでした"));

									return false;
								}
							})
						}
					>
						同じ材料にする
					</Button>
				) : null}
			</span>
			{message ? (
				<p className={styles.message} role="alert">
					{message}
				</p>
			) : null}
		</li>
	);
}
