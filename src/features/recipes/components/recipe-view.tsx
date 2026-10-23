import { type ReactNode, useState } from "react";
import { Card } from "#/components/card/card";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Tag } from "#/components/tag/tag";
import type { RecipeDetail } from "../application/recipe-repository";
import { findIngredientLinkTarget } from "../domain/ingredient-link-target";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";
import { RecipeText } from "./recipe-text";
import * as styles from "./recipe-view.css";

type OpenLink = (publicId: string, trigger: HTMLElement) => void;

// リンクのレシピを、材料の下に、その場で開く（2段目まで最初から開き、3段目からは、押して開く）。
const initiallyOpenDepth = 2;

// 材料のグループの囲みの色の数（recipe-view.css.ts の groupBox と合わせる）。
const groupToneCount = 5;

type LinkedRecipes = Readonly<Record<string, RecipeDetail>>;

type IngredientTreeProps = {
	linkedRecipes?: LinkedRecipes;
	onOpenLink?: OpenLink;
	// 何段目のリンク先か（このレシピ自身は 0）。
	depth: number;
	// 表示している途中のレシピ（輪になっていないかを調べる）。
	ancestors: readonly string[];
};

type IngredientGroupNode = Extract<
	RecipeEditorIngredientNode,
	{ type: "group" }
>;

type IngredientLeafNode = Exclude<
	RecipeEditorIngredientNode,
	IngredientGroupNode
>;

type IngredientBlock =
	| { kind: "items"; key: string; items: IngredientLeafNode[] }
	| { kind: "group"; group: IngredientGroupNode; colorIndex: number };

// グループに入っていない材料は、枠なしの箇条書きにまとめる。グループは、1つずつ枠にする。
function toIngredientBlocks(
	nodes: readonly RecipeEditorIngredientNode[],
): IngredientBlock[] {
	const blocks: IngredientBlock[] = [];
	let groupCount = 0;

	for (const node of nodes) {
		if (node.type === "group") {
			blocks.push({ kind: "group", group: node, colorIndex: groupCount });
			groupCount += 1;
			continue;
		}

		const last = blocks.at(-1);

		if (last?.kind === "items") {
			last.items.push(node);
		} else {
			blocks.push({ kind: "items", key: node.id, items: [node] });
		}
	}

	return blocks;
}

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
				<IngredientList
					nodes={recipe.ingredients}
					linkViews={recipe.linkViews}
					{...tree}
					ancestors={[...tree.ancestors, recipe.publicId]}
				/>
			) : null}
		</div>
	);
}

// グループ名で、色つきの枠に囲む。枠の中は、1段の箇条書き。
function IngredientList({
	nodes,
	linkViews,
	...tree
}: IngredientTreeProps & {
	nodes: readonly RecipeEditorIngredientNode[];
	linkViews: readonly RecipeLinkView[];
}) {
	return (
		<div className={styles.ingredientBlocks}>
			{toIngredientBlocks(nodes).map((block) =>
				block.kind === "group" ? (
					<section
						key={block.group.id}
						className={styles.groupBox}
						data-tone={block.colorIndex % groupToneCount}
					>
						<h4 className={styles.groupTitle}>{block.group.name}</h4>
						<IngredientList
							nodes={block.group.children}
							linkViews={linkViews}
							{...tree}
						/>
					</section>
				) : (
					<ul key={block.key} className={styles.list}>
						{block.items.map((item) => (
							<IngredientItem
								key={item.id}
								node={item}
								linkViews={linkViews}
								{...tree}
							/>
						))}
					</ul>
				),
			)}
		</div>
	);
}

function IngredientItem({
	node,
	linkViews,
	...tree
}: IngredientTreeProps & {
	node: IngredientLeafNode;
	linkViews: readonly RecipeLinkView[];
}) {
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
	// 題名の下に並べる印（公開範囲など）。
	badges?: ReactNode;
	hideTitle?: boolean;
};

type RecipeTab = "prepare" | "cook";

const tabOptions = [
	{ value: "prepare", label: "そろえる" },
	{ value: "cook", label: "作りかた" },
] as const;

export function RecipeView({
	recipe,
	onOpenLink,
	titleId,
	linkedRecipes,
	badges,
	hideTitle,
}: RecipeViewProps) {
	const [tab, setTab] = useState<RecipeTab>("prepare");
	const hasCookPane =
		recipe.instructions.length > 0 ||
		recipe.sourceUrl !== null ||
		recipe.note.length > 0;

	return (
		<article className={styles.container}>
			<header className={styles.header}>
				{hideTitle ? null : (
					<h2 id={titleId} className={styles.title}>
						{recipe.name}
					</h2>
				)}
				{badges ? <div className={styles.tags}>{badges}</div> : null}
			</header>

			{/* 狭い画面では、タブで切り替える（広い画面では、左右に並べるので隠れる）。 */}
			{hasCookPane ? (
				<div className={styles.tabs}>
					<SegmentedControl
						label="表示する内容"
						options={tabOptions}
						value={tab}
						onChange={setTab}
					/>
				</div>
			) : null}

			<div className={styles.panes} data-single={!hasCookPane}>
				<div className={styles.pane} data-active={tab === "prepare"}>
					<Card padding="md">
						<section className={styles.section}>
							<div className={styles.sectionHeader}>
								<h3 className={styles.sectionTitle}>材料</h3>
								<Tag>{recipe.servings}人分</Tag>
							</div>
							{recipe.ingredients.length === 0 ? (
								<p>材料は登録されていません。</p>
							) : (
								<IngredientList
									nodes={recipe.ingredients}
									linkViews={recipe.linkViews}
									onOpenLink={onOpenLink}
									linkedRecipes={linkedRecipes}
									depth={0}
									ancestors={[recipe.publicId]}
								/>
							)}
						</section>
					</Card>

					{recipe.preparations.length > 0 ? (
						<Card padding="md">
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
						</Card>
					) : null}
				</div>

				{hasCookPane ? (
					<div className={styles.pane} data-active={tab === "cook"}>
						{recipe.instructions.length > 0 ? (
							<Card padding="md">
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
							</Card>
						) : null}

						{recipe.sourceUrl !== null ? (
							<Card padding="md">
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
							</Card>
						) : null}

						{recipe.note.length > 0 ? (
							<Card padding="md">
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
							</Card>
						) : null}
					</div>
				) : null}
			</div>
		</article>
	);
}
