import { type RecipeLinkView, splitTextByLinks } from "../domain/recipe-links";
import * as styles from "./recipe-view.css";

type RecipeTextProps = {
	text: string;
	linkViews: readonly RecipeLinkView[];
	// リンクを押したとき（リンク先の ID と、押したボタン）。なければ、リンクを押せない文字として表示する。
	onOpenLink?: (publicId: string, trigger: HTMLElement) => void;
};

// 本文を表示する。[[ラベル]] は、リンク先の現在の名前（押すと、プレビュー）にする。
// - リンク先が見つかる：リンク先の名前（下線つきのボタン）
// - リンク先が削除された・見られない：「（見つからないレシピ）」
// - リンク先を決めていない：ラベルを、ふつうの文字で（括弧なし）
export function RecipeText({ text, linkViews, onOpenLink }: RecipeTextProps) {
	return (
		<>
			{splitTextByLinks(text).map((segment, index) => {
				// 並びは、文章の順のまま。
				const key = `${index}-${segment.type}`;

				if (segment.type === "text") {
					return <span key={key}>{segment.text}</span>;
				}

				const view = linkViews.find(
					(candidate) => candidate.label === segment.label,
				);

				if (!view) {
					return <span key={key}>{segment.label}</span>;
				}

				if (!view.target) {
					return (
						<span key={key} className={styles.missingLink}>
							（見つからないレシピ）
						</span>
					);
				}

				const { publicId, name } = view.target;

				return onOpenLink ? (
					<button
						key={key}
						type="button"
						className={styles.linkButton}
						aria-haspopup="dialog"
						onClick={(event) => onOpenLink(publicId, event.currentTarget)}
					>
						{name}
					</button>
				) : (
					<span key={key}>{name}</span>
				);
			})}
		</>
	);
}
