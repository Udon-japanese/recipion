import { Link } from "@tanstack/react-router";
import { Tag } from "#/components/tag/tag";
import { AvatarArt } from "#/features/avatar/components/avatar-art";
import { DishCoverView } from "#/features/dish-art/components/dish-cover-view";
import type { PublicRecipeSummary } from "../domain/public-recipe-search";
import { publicRecipeTagLabel } from "../domain/recipe-tags";
import * as styles from "./public-recipe-card.css";

// カードに出す公開用のタグの数（多いと、カードの高さがそろわない）。
const shownTagCount = 2;

// 材料のちょい見せの文（「豚こま・キャベツ・卵・醤油 ほか3品」）。材料がなければ、null。
export function formatIngredientPreview({
	names,
	total,
}: PublicRecipeSummary["ingredientPreview"]): string | null {
	if (names.length === 0) {
		return null;
	}

	const rest = total - names.length;

	return rest > 0 ? `${names.join("・")} ほか${rest}品` : names.join("・");
}

// みんなのレシピの1枚（料理の絵・名前・材料のちょい見せ・作者・タグ）。カード全体が、レシピへのリンク。
export function PublicRecipeCard({ recipe }: { recipe: PublicRecipeSummary }) {
	const ingredients = formatIngredientPreview(recipe.ingredientPreview);
	const tags = recipe.publicTags.slice(0, shownTagCount);

	return (
		<li className={styles.card}>
			<span className={styles.art}>
				<DishCoverView cover={recipe.cover} seed={recipe.publicId} size={96} />
				{recipe.yieldText ? (
					<span className={styles.yieldBadge}>{recipe.yieldText}</span>
				) : null}
			</span>
			<div className={styles.body}>
				<Link
					className={styles.link}
					to="/recipes/$publicId"
					params={{ publicId: recipe.publicId }}
				>
					<h3 className={styles.name}>{recipe.name}</h3>
				</Link>
				{ingredients ? (
					<p className={styles.ingredients}>{ingredients}</p>
				) : null}
				<div className={styles.footer}>
					<span className={styles.author}>
						<AvatarArt avatar={recipe.authorAvatar} size={20} />
						<span className={styles.authorName}>{recipe.authorName}</span>
					</span>
					{tags.length > 0 ? (
						<span className={styles.tags}>
							{tags.map((tag) => (
								<Tag key={tag} tone="soft">
									{publicRecipeTagLabel(tag)}
								</Tag>
							))}
						</span>
					) : null}
				</div>
			</div>
		</li>
	);
}
