import type { RecipeDetail } from "../application/recipe-repository";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import * as styles from "./recipe-view.css";

function IngredientNode({ node }: { node: RecipeEditorIngredientNode }) {
	if (node.type === "group") {
		return (
			<li>
				<strong>{node.name}</strong>
				<ul className={styles.nestedList}>
					{node.children.map((child) => (
						<IngredientNode key={child.id} node={child} />
					))}
				</ul>
			</li>
		);
	}

	return (
		<li className={styles.ingredientRow}>
			<span>{node.name}</span>
			<span>{node.amountText}</span>
		</li>
	);
}

type RecipeViewProps = {
	recipe: RecipeDetail;
};

export function RecipeView({ recipe }: RecipeViewProps) {
	return (
		<article className={styles.container}>
			<h2 className={styles.title}>{recipe.name}</h2>
			<p className={styles.servings}>{recipe.servings}人分</p>

			<section className={styles.section}>
				<h3 className={styles.sectionTitle}>材料</h3>
				{recipe.ingredients.length === 0 ? (
					<p>材料は登録されていません。</p>
				) : (
					<ul className={styles.list}>
						{recipe.ingredients.map((node) => (
							<IngredientNode key={node.id} node={node} />
						))}
					</ul>
				)}
			</section>

			{recipe.preparations.length > 0 ? (
				<section className={styles.section}>
					<h3 className={styles.sectionTitle}>下準備</h3>
					<ul className={styles.list}>
						{recipe.preparations.map((preparation) => (
							<li key={preparation.id}>{preparation.text}</li>
						))}
					</ul>
				</section>
			) : null}

			{recipe.instructions.length > 0 ? (
				<section className={styles.section}>
					<h3 className={styles.sectionTitle}>作り方</h3>
					<ol className={styles.list}>
						{recipe.instructions.map((instruction) => (
							<li key={instruction.id}>{instruction.text}</li>
						))}
					</ol>
				</section>
			) : null}

			{recipe.sourceUrl !== null ? (
				<section className={styles.section}>
					<h3 className={styles.sectionTitle}>引用元</h3>
					{/^https?:\/\//iu.test(recipe.sourceUrl) ? (
						<a
							className={styles.sourceUrl}
							href={recipe.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							{recipe.sourceUrl}
						</a>
					) : (
						<p className={styles.sourceUrl}>{recipe.sourceUrl}</p>
					)}
				</section>
			) : null}

			{recipe.note.length > 0 ? (
				<section className={styles.section}>
					<h3 className={styles.sectionTitle}>メモ</h3>
					<p className={styles.note}>{recipe.note}</p>
				</section>
			) : null}
		</article>
	);
}
