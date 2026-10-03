import { Link } from "@tanstack/react-router";
import type { RecipeSummary } from "../application/recipe-repository";
import * as styles from "./recipe-list.css";

type RecipeListProps = {
	recipes: readonly RecipeSummary[];
};

export function RecipeList({ recipes }: RecipeListProps) {
	return (
		<section className={styles.container}>
			<h2 className={styles.title}>レシピ</h2>

			<p>
				<Link to="/recipes/new">レシピを登録</Link>
			</p>

			{recipes.length === 0 ? (
				<p>レシピはまだありません。</p>
			) : (
				<ul className={styles.list}>
					{recipes.map((recipe) => (
						<li key={recipe.publicId} className={styles.row}>
							<Link
								to="/recipes/$publicId"
								params={{ publicId: recipe.publicId }}
							>
								{recipe.name}
							</Link>
							<span>{recipe.servings}人分</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
