import { type ReactNode, useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Card } from "#/components/card/card";
import { Checkbox } from "#/components/checkbox/checkbox";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Toggle } from "#/components/toggle/toggle";
import { DishCoverView } from "#/features/dish-art/components/dish-cover-view";
import type { RecipeDetail } from "../application/recipe-repository";
import { findIngredientLinkTarget } from "../domain/ingredient-link-target";
import { linkedRecipeRatio } from "../domain/link-ingredient-needs";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import { type RecipeLinkView, stripLinkBrackets } from "../domain/recipe-links";
import { scaleRecipeYieldText } from "../domain/recipe-yield";
import { scaleIngredientAmountText } from "../domain/scale-amount";
import { RecipeText } from "./recipe-text";
import * as styles from "./recipe-view.css";

// ratio：リンク先の何回分を見せるか（材料のリンクの矢印から開くとき。本文のリンクは 1）。
type OpenLink = (
	publicId: string,
	trigger: HTMLElement,
	ratio?: number,
) => void;

// リンクのレシピを、材料の下に、その場で開く（2段目まで最初から開き、3段目からは、押して開く）。
const initiallyOpenDepth = 2;

// 材料のグループの囲みの色の数（recipe-view.css.ts の groupBox と合わせる）。
const groupToneCount = 5;

type LinkedRecipes = Readonly<Record<string, RecipeDetail>>;

// 調理中のチェックリスト（材料の ID → 用意した）。画面を開いている間だけで、どこにも保存しない（在庫・買い物メモ・本文も変えない）。
type IngredientChecklist = {
	checked: ReadonlySet<string>;
	setChecked: (ids: readonly string[], checked: boolean) => void;
};

type IngredientTreeProps = {
	// チェックリストで見ているとき。
	checklist?: IngredientChecklist;
	linkedRecipes?: LinkedRecipes;
	onOpenLink?: OpenLink;
	// 何段目のリンク先か（このレシピ自身は 0）。
	depth: number;
	// 分量に掛ける割合（人数を変えたとき・リンク先の何回分か）。
	ratio: number;
	// 表示している途中のレシピ（輪になっていないかを調べる）。
	ancestors: readonly string[];
	// リンク先の箱の中か。
	nested?: boolean;
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

// リンクの材料の行。名前の行を押すと、リンク先の材料を、その下に開閉する。右の矢印で、リンク先のプレビューを開く。
// 上の段のリンクは、リンク先の色の箱に入れる。箱の中の、さらに深いリンクは、箱を重ねず、字下げだけで表す。
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
	// リンク先の分量に掛ける割合：このレシピの割合 × リンクの行の割合（半分・2人分など）。
	const childRatio = tree.ratio * linkedRecipeRatio(node, recipe.yieldText);
	const content = (
		<>
			<div className={styles.linkedHeader}>
				<button
					type="button"
					className={styles.linkedToggle}
					aria-expanded={isOpen}
					aria-label={`${recipe.name}の材料`}
					onClick={() => setIsOpen((current) => !current)}
				>
					<span className={styles.linkedName}>
						<RecipeText text={node.name} linkViews={linkViews} />
					</span>
					<span className={styles.amount}>
						{scaleIngredientAmountText(node, tree.ratio)}
					</span>
					<span className={styles.chevron} data-open={isOpen}>
						<Icon name="chevron-down" size={20} />
					</span>
				</button>
				{tree.onOpenLink ? (
					<IconButton
						icon="arrow-up-right"
						label={`${recipe.name}のレシピを見る`}
						tone="plain"
						aria-haspopup="dialog"
						onClick={(event) =>
							tree.onOpenLink?.(
								recipe.publicId,
								event.currentTarget,
								childRatio,
							)
						}
					/>
				) : null}
			</div>
			{isOpen ? (
				<div className={styles.linkedChildren} data-indent={tree.nested}>
					<IngredientList
						nodes={recipe.ingredients}
						linkViews={recipe.linkViews}
						{...tree}
						ratio={childRatio}
						nested
						ancestors={[...tree.ancestors, recipe.publicId]}
					/>
				</div>
			) : null}
		</>
	);

	return tree.nested ? (
		content
	) : (
		<div className={styles.linkedBox}>{content}</div>
	);
}

// その材料の行が、リンク先のレシピとして開くもの（その場で材料を展開する）なら、そのレシピ。
function linkedRecipeOf(
	node: IngredientLeafNode,
	linkViews: readonly RecipeLinkView[],
	tree: IngredientTreeProps,
): RecipeDetail | undefined {
	const target = findIngredientLinkTarget(node.name, linkViews);

	if (!target || tree.ancestors.includes(target.publicId)) {
		return undefined;
	}

	return tree.linkedRecipes?.[target.publicId];
}

// チェックできる行（グループの直下の、ふつうの材料。リンク先の見出しの行は、中の材料をチェックする）。
function checkableIds(
	nodes: readonly RecipeEditorIngredientNode[],
	linkViews: readonly RecipeLinkView[],
	tree: IngredientTreeProps,
): string[] {
	return nodes.flatMap((node) =>
		node.type === "group" || linkedRecipeOf(node, linkViews, tree)
			? []
			: [node.id],
	);
}

// グループの見出しの、全部チェック／全部外す。
function GroupChecklistAction({
	ids,
	groupName,
	checklist,
}: {
	ids: readonly string[];
	groupName: string;
	checklist: IngredientChecklist;
}) {
	if (ids.length === 0) {
		return null;
	}

	const isAllChecked = ids.every((id) => checklist.checked.has(id));

	return (
		<Button
			variant="secondary"
			size="sm"
			aria-label={`${groupName}を${isAllChecked ? "全部外す" : "全部チェック"}`}
			onClick={() => checklist.setChecked(ids, !isAllChecked)}
		>
			{isAllChecked ? "全部外す" : "全部チェック"}
		</Button>
	);
}

// グループ名で、色つきの枠に囲む。枠の中は、1段の行。
// リンク先の箱の中（nested）では、枠にせず、小さな見出しだけにする。
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
						className={tree.nested ? styles.nestedGroup : styles.groupBox}
						data-tone={block.colorIndex % groupToneCount}
					>
						<div className={styles.groupHeader}>
							<h4 className={styles.groupTitle}>{block.group.name}</h4>
							{tree.checklist ? (
								<GroupChecklistAction
									ids={checkableIds(block.group.children, linkViews, tree)}
									groupName={block.group.name}
									checklist={tree.checklist}
								/>
							) : null}
						</div>
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
	const linkedRecipe = linkedRecipeOf(node, linkViews, tree);
	const isCycle = target ? tree.ancestors.includes(target.publicId) : false;
	const isChecked = tree.checklist?.checked.has(node.id) ?? false;

	return (
		<li className={styles.ingredientItem}>
			{linkedRecipe ? (
				<LinkedIngredient
					node={node}
					recipe={linkedRecipe}
					linkViews={linkViews}
					{...tree}
					depth={tree.depth + 1}
				/>
			) : (
				<div
					className={styles.ingredientRow}
					data-checklist={tree.checklist ? true : undefined}
					data-checked={isChecked || undefined}
				>
					{tree.checklist ? (
						<Checkbox
							label={`${stripLinkBrackets(node.name)}をチェック`}
							checked={isChecked}
							onChange={(event) =>
								tree.checklist?.setChecked([node.id], event.target.checked)
							}
						/>
					) : null}
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
					<span className={styles.amount}>
						{scaleIngredientAmountText(node, tree.ratio)}
					</span>
				</div>
			)}
		</li>
	);
}

function RecipeSection({
	title,
	titleNote,
	titleControl,
	action,
	footer,
	children,
}: {
	title: string;
	// 見出しのすぐ横に、小さく添える文字（材料の、できあがりの量など）。
	titleNote?: string;
	// 見出しのすぐ横に置く操作（材料の量を変える）。あれば、titleNote の代わり。
	titleControl?: ReactNode;
	// 見出しの右に置くもの。
	action?: ReactNode;
	// カードの一番下に、線で区切って置くもの。
	footer?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Card padding="md">
			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<div className={styles.sectionTitleGroup}>
						<h3 className={styles.sectionTitle}>{title}</h3>
						{titleControl ??
							(titleNote ? (
								<span className={styles.sectionTitleNote}>{titleNote}</span>
							) : null)}
					</div>
					{action}
				</div>
				{children}
				{footer ? <div className={styles.sectionFooter}>{footer}</div> : null}
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
	// 材料の見出しの右に置くもの（買い物メモへ）。材料がなければ、出さない。
	ingredientsAction?: ReactNode;
	// 作り終えたときの操作（つくった）。作り方のカードの一番下（作り方がなければ、材料のカードの一番下）。
	madeAction?: ReactNode;
	// プレビューの中など、狭い枠で使うとき（料理の絵を小さくする）。
	compact?: boolean;
	// 材料を、調理中のチェックリストで見られるようにする（レシピの詳細の画面）。初めは、ふつうの表示。
	checklist?: boolean;
	// 分量に掛ける割合（人数を変えたとき・プレビューでリンク先の何回分を見せるとき）。省略は 1。
	ratio?: number;
	// 材料の見出しの横に、量の文字の代わりに置くもの（量を変える操作）。
	yieldControl?: ReactNode;
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
	ingredientsAction,
	madeAction,
	compact = false,
	checklist: canUseChecklist = false,
	ratio = 1,
	yieldControl,
}: RecipeViewProps) {
	const [tab, setTab] = useState<RecipeTab>("prepare");
	const [isChecklist, setIsChecklist] = useState(false);
	const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const checklistToggleId = useId();
	const checklist: IngredientChecklist | undefined = isChecklist
		? {
				checked: checkedIds,
				setChecked: (ids, checked) =>
					setCheckedIds((current) => {
						const next = new Set(current);

						for (const id of ids) {
							if (checked) {
								next.add(id);
							} else {
								next.delete(id);
							}
						}

						return next;
					}),
			}
		: undefined;
	const hasIngredients = recipe.ingredients.length > 0;
	const hasPreparePane = hasIngredients || recipe.preparations.length > 0;
	const hasCookPane =
		recipe.instructions.length > 0 ||
		recipe.sourceUrl !== null ||
		recipe.note.length > 0;
	const hasTabs = hasPreparePane && hasCookPane;
	const hasInstructions = recipe.instructions.length > 0;

	return (
		<article className={styles.container}>
			<header
				className={styles.header}
				data-compact={compact}
				data-has-actions={actions ? true : undefined}
			>
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
					{badges ? <div className={styles.meta}>{badges}</div> : null}
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
								<RecipeSection
									title="材料"
									titleNote={scaleRecipeYieldText(recipe.yieldText, ratio)}
									titleControl={yieldControl}
									action={ingredientsAction}
									footer={hasInstructions ? undefined : madeAction}
								>
									{canUseChecklist ? (
										<div className={styles.checklistToggle}>
											<label htmlFor={checklistToggleId} aria-hidden="true">
												チェックリストで見る
											</label>
											<Toggle
												id={checklistToggleId}
												label="チェックリストで見る"
												checked={isChecklist}
												onChange={setIsChecklist}
											/>
										</div>
									) : null}
									<IngredientList
										nodes={recipe.ingredients}
										linkViews={recipe.linkViews}
										onOpenLink={onOpenLink}
										linkedRecipes={linkedRecipes}
										depth={0}
										ratio={ratio}
										ancestors={[recipe.publicId]}
										checklist={checklist}
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
							{hasInstructions ? (
								<RecipeSection
									title="作り方"
									action={instructionsAction}
									footer={madeAction}
								>
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
