import { Tag } from "#/components/tag/tag";
import {
	type PublicRecipeTag,
	publicRecipeTagLabel,
} from "../domain/recipe-tags";
import * as styles from "./recipe-tag-line.css";

type RecipeTagLineProps = {
	publicTags: readonly PublicRecipeTag[];
	// 本人が見ているときだけ入る（他の人に返すレシピでは、空）。
	personalTags: readonly string[];
};

// レシピの題名の下の、タグの1行。個人用のタグは、鍵の印で「自分だけに見える」と分かるようにする。
export function RecipeTagLine({
	publicTags,
	personalTags,
}: RecipeTagLineProps) {
	if (publicTags.length === 0 && personalTags.length === 0) {
		return null;
	}

	return (
		<ul className={styles.line} aria-label="タグ">
			{publicTags.map((tag) => (
				<li key={`public:${tag}`}>
					<Tag>{publicRecipeTagLabel(tag)}</Tag>
				</li>
			))}
			{personalTags.map((tag) => (
				<li key={`personal:${tag}`}>
					<Tag icon="lock">
						<span className={styles.hidden}>自分だけのタグ：</span>
						{tag}
					</Tag>
				</li>
			))}
		</ul>
	);
}
