import { type ReactNode, useState } from "react";
import { Card } from "#/components/card/card";
import { Icon } from "#/components/icon/icon";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { DishCoverView } from "#/features/dish-art/components/dish-cover-view";
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

// グループに入っていない材料は、枠なしの行にまとめる。グループは、1つずつ枠にする。
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

// リンクの材料の行。行を押すと、リンク先の材料を、下の箱に開閉する。リンク先のプレビューは、箱の中から開く。
function LinkedIngredient({
	node,
	recipe,
	linkViews,
	...tree
}: IngredientTreeProps & {
	node: IngredientLeafNode;
	recipe: RecipeDetail;
	linkViews: readonly RecipeLinkView[];
}) {
	const [isOpen, setIsOpen] = useState(tree.depth <= initiallyOpenDepth);

	return (
		<>
			<button
				type="button"
				className={styles.linkedRow}
				aria-expanded={isOpen}
				aria-label={`${recipe.name}の材料`}
				onClick={() => setIsOpen((current) => !current)}
			>
				<span className={styles.linkedName}>
					<RecipeText text={node.name} linkViews={linkViews} />
				</span>
				<span className={styles.amount}>{node.amountText}</span>
				<span className={styles.chevron} data-open={isOpen}>
					<Icon name="chevron-down" size={20} />
				</span>
			</button>
			{isOpen ? (
				<div className={styles.linkedBox} data-depth={Math.min(tree.depth, 3)}>
					<IngredientList
						nodes={recipe.ingredients}
						linkViews={recipe.linkViews}
						{...tree}
						ancestors={[...tree.ancestors, recipe.publicId]}
					/>
					{tree.onOpenLink ? (
						<button
							type="button"
							className={styles.linkedOpen}
							aria-haspopup="dialog"
							onClick={(event) =>
								tree.onOpenLink?.(recipe.publicId, event.currentTarget)
							}
						>
							{recipe.name}のレシピを見る
							<Icon name="chevron-right" size={16} />
						</button>
					) : null}
				</div>
			) : null}
		</>
	);
}

// グループ名で、色つきの枠に囲む。枠の中は、1段の行。
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
					<ul key={block.key} className={styles.ingredientList}>
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
		<li className={styles.ingredientItem}>
			{linkedRecipe && !isCycle ? (
				<LinkedIngredient
					node={node}
					recipe={linkedRecipe}
					linkViews={linkViews}
					{...tree}
					depth={tree.depth + 1}
				/>
			) : (
				<div className={styles.ingredientRow}>
					<span className={styles.ingredientName}>
						<RecipeText
							text={node.name}
							linkViews={linkViews}
							onOpenLink={tree.onOpenLink}
						/>
						{isCycle ? (
							<span className={styles.linkedNote}>（上で表示済み）</span>
						) : null}
					</span>
					<span className={styles.amount}>{node.amountText}</span>
				</div>
			)}
		</li>
	);
}

function RecipeSection({
	title,
	action,
	children,
}: {
	title: string;
	// 見出しの右に置くもの。
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Card padding="md">
			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h3 className={styles.sectionTitle}>{title}</h3>
					{action}
				</div>
				{children}
			</section>
		</Card>
	);
}

export type RecipeViewProps = {
	recipe: RecipeDetail;
	// 本文のリンクを押したとき。なければ、リンクは押せない文字になる。
	onOpenLink?: OpenLink;
	// タイトルの id（プレビューの枠の、aria-labelledby 用）。
	titleId?: string;
	// 材料のリンク先のレシピ（公開 ID → レシピ）。あれば、材料の下に、その場で開く。
	linkedRecipes?: LinkedRecipes;
	// 題名の下に並べる印（公開範囲・作者など）。
	badges?: ReactNode;
	hideTitle?: boolean;
	// 題名の右に置く操作（編集・その他）。
	actions?: ReactNode;
	// 題名の下の、全幅の欄（限定公開のパスフレーズなど）。
	headerExtra?: ReactNode;
	// 作り方の見出しの右に置くもの（画面をつけたまま）。作り方がなければ、出さない。
	instructionsAction?: ReactNode;
	// プレビューの中など、狭い枠で使うとき（料理の絵を小さくする）。
	compact?: boolean;
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
	actions,
	headerExtra,
	instructionsAction,
	compact = false,
}: RecipeViewProps) {
	const [tab, setTab] = useState<RecipeTab>("prepare");
	const hasIngredients = recipe.ingredients.length > 0;
	const hasPreparePane = hasIngredients || recipe.preparations.length > 0;
	const hasCookPane =
		recipe.instructions.length > 0 ||
		recipe.sourceUrl !== null ||
		recipe.note.length > 0;
	const hasTabs = hasPreparePane && hasCookPane;

	return (
		<article className={styles.container}>
			<header className={styles.header} data-compact={compact}>
				<span className={styles.cover}>
					<DishCoverView
						cover={recipe.cover}
						seed={recipe.publicId}
						size={compact ? 56 : 80}
					/>
				</span>
				<div className={styles.heading}>
					{hideTitle ? null : (
						<h2 id={titleId} className={styles.title}>
							{recipe.name}
						</h2>
					)}
					{badges || hasIngredients ? (
						<div className={styles.meta}>
							{badges}
							{hasIngredients ? (
								<span className={styles.servings}>{recipe.servings}人分</span>
							) : null}
						</div>
					) : null}
				</div>
				{actions ? <div className={styles.actions}>{actions}</div> : null}
				{headerExtra ? (
					<div className={styles.headerExtra}>{headerExtra}</div>
				) : null}
			</header>

			{/* 狭い画面では、タブで切り替える（広い画面では、左右に並べるので隠れる）。 */}
			{hasTabs ? (
				<div className={styles.tabs}>
					<SegmentedControl
						label="表示する内容"
						options={tabOptions}
						value={tab}
						onChange={setTab}
					/>
				</div>
			) : null}

			{hasPreparePane || hasCookPane ? (
				<div className={styles.panes} data-single={!hasTabs}>
					{hasPreparePane ? (
						<div
							className={styles.pane}
							data-active={!hasTabs || tab === "prepare"}
						>
							{hasIngredients ? (
								<RecipeSection title="材料">
									<IngredientList
										nodes={recipe.ingredients}
										linkViews={recipe.linkViews}
										onOpenLink={onOpenLink}
										linkedRecipes={linkedRecipes}
										depth={0}
										ancestors={[recipe.publicId]}
									/>
								</RecipeSection>
							) : null}

							{recipe.preparations.length > 0 ? (
								<RecipeSection title="下準備">
									<ul className={styles.bulletList}>
										{recipe.preparations.map((preparation) => (
											<li key={preparation.id} className={styles.bulletItem}>
												<RecipeText
													text={preparation.text}
													linkViews={recipe.linkViews}
													onOpenLink={onOpenLink}
												/>
											</li>
										))}
									</ul>
								</RecipeSection>
							) : null}
						</div>
					) : null}

					{hasCookPane ? (
						<div
							className={styles.pane}
							data-active={!hasTabs || tab === "cook"}
						>
							{recipe.instructions.length > 0 ? (
								<RecipeSection title="作り方" action={instructionsAction}>
									<ol className={styles.steps}>
										{recipe.instructions.map((instruction) => (
											<li key={instruction.id} className={styles.step}>
												<span className={styles.stepText}>
													<RecipeText
														text={instruction.text}
														linkViews={recipe.linkViews}
														onOpenLink={onOpenLink}
													/>
												</span>
											</li>
										))}
									</ol>
								</RecipeSection>
							) : null}

							{recipe.note.length > 0 ? (
								<RecipeSection title="メモ">
									<p className={styles.note}>
										<RecipeText
											text={recipe.note}
											linkViews={recipe.linkViews}
											onOpenLink={onOpenLink}
										/>
									</p>
								</RecipeSection>
							) : null}

							{recipe.sourceUrl !== null ? (
								<RecipeSection title="引用元">
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
								</RecipeSection>
							) : null}
						</div>
					) : null}
				</div>
			) : (
				<Card padding="md">
					<p className={styles.empty}>まだ中身がありません。</p>
				</Card>
			)}
		</article>
	);
}
