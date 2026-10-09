import { useState } from "react";
import type { RecipeDetail } from "../application/recipe-repository";
import { findIngredientLinkTarget } from "../domain/ingredient-link-target";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";
import { RecipeText } from "./recipe-text";
import * as styles from "./recipe-view.css";

type OpenLink = (publicId: string, trigger: HTMLElement) => void;

// リンクのレシピを、材料の下に、その場で開く（2段目まで最初から開き、3段目からは、押して開く）。
const initiallyOpenDepth = 2;

type LinkedRecipes = Readonly<Record<string, RecipeDetail>>;

type IngredientTreeProps = {
	linkedRecipes?: LinkedRecipes;
	onOpenLink?: OpenLink;
	// 何段目のリンク先か（このレシピ自身は 0）。
	depth: number;
	// 表示している途中のレシピ（輪になっていないかを調べる）。
	ancestors: readonly string[];
};

function LinkedIngredients({
	recipe,
	...tree
}: IngredientTreeProps & { recipe: RecipeDetail }) {
	const [isOpen, setIsOpen] = useState(tree.depth <= initiallyOpenDepth);

	return (
		<div className={styles.linkedRecipe}>
			<button
				type="button"
				className={styles.linkedToggle}
				aria-expanded={isOpen}
				onClick={() => setIsOpen((current) => !current)}
			>
				{recipe.name}の材料を{isOpen ? "閉じる" : "開く"}
			</button>
			{isOpen ? (
				<ul className={styles.nestedList}>
					{recipe.ingredients.map((node) => (
						<IngredientNode
							key={node.id}
							node={node}
							linkViews={recipe.linkViews}
							{...tree}
							ancestors={[...tree.ancestors, recipe.publicId]}
						/>
					))}
				</ul>
			) : null}
		</div>
	);
}

function IngredientNode({
	node,
	linkViews,
	...tree
}: IngredientTreeProps & {
	node: RecipeEditorIngredientNode;
	linkViews: readonly RecipeLinkView[];
}) {
	if (node.type === "group") {
		return (
			<li>
				<strong>{node.name}</strong>
				<ul className={styles.nestedList}>
					{node.children.map((child) => (
						<IngredientNode
							key={child.id}
							node={child}
							linkViews={linkViews}
							{...tree}
						/>
					))}
				</ul>
			</li>
		);
	}

	const target = findIngredientLinkTarget(node.name, linkViews);
	const linkedRecipe = target
		? tree.linkedRecipes?.[target.publicId]
		: undefined;
	const isCycle = target ? tree.ancestors.includes(target.publicId) : false;

	return (
		<li>
			<div className={styles.ingredientRow}>
				<span>
					<RecipeText
						text={node.name}
						linkViews={linkViews}
						onOpenLink={tree.onOpenLink}
					/>
				</span>
				<span>{node.amountText}</span>
			</div>
			{isCycle ? (
				<p className={styles.linkedNote}>（上で表示済み）</p>
			) : linkedRecipe ? (
				<LinkedIngredients
					recipe={linkedRecipe}
					{...tree}
					depth={tree.depth + 1}
				/>
			) : null}
		</li>
	);
}

type RecipeViewProps = {
	recipe: RecipeDetail;
	// 本文のリンクを押したとき。なければ、リンクは押せない文字になる。
	onOpenLink?: OpenLink;
	// タイトルの id（プレビューの枠の、aria-labelledby 用）。
	titleId?: string;
	// 材料のリンク先のレシピ（公開 ID → レシピ）。あれば、材料の下に、その場で開く。
	linkedRecipes?: LinkedRecipes;
};

export function RecipeView({
	recipe,
	onOpenLink,
	titleId,
	linkedRecipes,
}: RecipeViewProps) {
	return (
		<article className={styles.container}>
			<h2 id={titleId} className={styles.title}>
				{recipe.name}
			</h2>
			<p className={styles.servings}>{recipe.servings}人分</p>

			<section className={styles.section}>
				<h3 className={styles.sectionTitle}>材料</h3>
				{recipe.ingredients.length === 0 ? (
					<p>材料は登録されていません。</p>
				) : (
					<ul className={styles.list}>
						{recipe.ingredients.map((node) => (
							<IngredientNode
								key={node.id}
								node={node}
								linkViews={recipe.linkViews}
								onOpenLink={onOpenLink}
								linkedRecipes={linkedRecipes}
								depth={0}
								ancestors={[recipe.publicId]}
							/>
						))}
					</ul>
				)}
			</section>

			{recipe.preparations.length > 0 ? (
				<section className={styles.section}>
					<h3 className={styles.sectionTitle}>下準備</h3>
					<ul className={styles.list}>
						{recipe.preparations.map((preparation) => (
							<li key={preparation.id}>
								<RecipeText
									text={preparation.text}
									linkViews={recipe.linkViews}
									onOpenLink={onOpenLink}
								/>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{recipe.instructions.length > 0 ? (
				<section className={styles.section}>
					<h3 className={styles.sectionTitle}>作り方</h3>
					<ol className={styles.list}>
						{recipe.instructions.map((instruction) => (
							<li key={instruction.id}>
								<RecipeText
									text={instruction.text}
									linkViews={recipe.linkViews}
									onOpenLink={onOpenLink}
								/>
							</li>
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
					<p className={styles.note}>
						<RecipeText
							text={recipe.note}
							linkViews={recipe.linkViews}
							onOpenLink={onOpenLink}
						/>
					</p>
				</section>
			) : null}
		</article>
	);
}
