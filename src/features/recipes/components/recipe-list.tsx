import { type ReactNode, useState } from "react";
import { ButtonLink } from "#/components/button/button-link";
import { Card } from "#/components/card/card";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, TextInput } from "#/components/field/field";
import { Mascot } from "#/components/mascot/mascot";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Tag } from "#/components/tag/tag";
import type { RecipeSummary } from "../application/recipe-repository";
import {
	collectOwnRecipeTags,
	filterOwnRecipes,
	type OwnRecipeTagFilter,
} from "../domain/filter-own-recipes";
import { maxSearchQueryLength } from "../domain/public-recipe-search";
import { publicRecipeTagLabel } from "../domain/recipe-tags";
import { recipeVisibilityLabels } from "../domain/recipe-visibility-label";
import * as styles from "./recipe-list.css";
import { RecipeSummaryRow } from "./recipe-summary-row";

export type RecipesTab = "mine" | "public" | "made";

function isSameTagFilter(a: OwnRecipeTagFilter, b: OwnRecipeTagFilter) {
	return a.kind === b.kind && a.tag === b.tag;
}

type RecipeListProps = {
	recipes: readonly RecipeSummary[];
	tab?: RecipesTab;
	onTabChange?: (tab: RecipesTab) => void;
	// 「みんなのレシピ」の中身（tab が public のとき、自分のレシピの代わりに出す）。
	publicPanel?: ReactNode;
	// 「つくった」の中身（tab が made のとき）。
	madePanel?: ReactNode;
};

export function RecipeList({
	recipes,
	tab = "mine",
	onTabChange,
	publicPanel,
	madePanel,
}: RecipeListProps) {
	const [searchText, setSearchText] = useState("");
	const [tagFilters, setTagFilters] = useState<OwnRecipeTagFilter[]>([]);
	const usedTags = collectOwnRecipeTags(recipes);
	const tagOptions: { filter: OwnRecipeTagFilter; label: string }[] = [
		...usedTags.publicTags.map((tag) => ({
			filter: { kind: "public" as const, tag },
			label: publicRecipeTagLabel(tag),
		})),
		...usedTags.personalTags.map((tag) => ({
			filter: { kind: "personal" as const, tag },
			label: tag,
		})),
	];
	// 消したタグなど、もう使われていないタグは、絞り込みから外す。
	const activeTagFilters = tagFilters.filter((filter) =>
		tagOptions.some((option) => isSameTagFilter(option.filter, filter)),
	);
	const shownRecipes = filterOwnRecipes(recipes, searchText, activeTagFilters);

	function toggleTagFilter(filter: OwnRecipeTagFilter) {
		setTagFilters((current) =>
			current.some((selected) => isSameTagFilter(selected, filter))
				? current.filter((selected) => !isSameTagFilter(selected, filter))
				: [...current, filter],
		);
	}

	return (
		<section className={styles.container}>
			<div className={styles.titleRow}>
				<h2 className={styles.title}>レシピ</h2>
				<ButtonLink to="/recipes/new" size="sm">
					レシピを登録
				</ButtonLink>
			</div>

			{onTabChange ? (
				<SegmentedControl
					label="表示するレシピ"
					value={tab}
					onChange={onTabChange}
					options={[
						{ value: "mine", label: "自分のレシピ" },
						{ value: "public", label: "みんなのレシピ" },
						{ value: "made", label: "つくった" },
					]}
				/>
			) : null}

			{tab === "public" ? (
				publicPanel
			) : tab === "made" ? (
				madePanel
			) : recipes.length === 0 ? (
				<div className={styles.empty}>
					<Mascot size={64} motion="still" />
					<p className={styles.emptyText}>レシピはまだありません。</p>
				</div>
			) : (
				<>
					<search className={styles.search}>
						<Field label="自分のレシピを探す" hideLabel>
							{(control) => (
								<TextInput
									{...control}
									type="search"
									value={searchText}
									maxLength={maxSearchQueryLength}
									placeholder="レシピ名で探す"
									onChange={(event) => setSearchText(event.target.value)}
								/>
							)}
						</Field>
						{tagOptions.length > 0 ? (
							<ChipGroup label="タグで絞り込む">
								{tagOptions.map((option) => (
									<Chip
										key={`${option.filter.kind}:${option.filter.tag}`}
										pressed={activeTagFilters.some((selected) =>
											isSameTagFilter(selected, option.filter),
										)}
										onClick={() => toggleTagFilter(option.filter)}
									>
										{option.label}
									</Chip>
								))}
							</ChipGroup>
						) : null}
					</search>

					{shownRecipes.length === 0 ? (
						<div className={styles.empty}>
							<Mascot size={64} motion="still" />
							<p className={styles.emptyText}>
								{searchText.trim() === ""
									? "選んだタグに合うレシピは見つかりませんでした。"
									: `「${searchText.trim()}」に合うレシピは見つかりませんでした。`}
							</p>
						</div>
					) : (
						<Card>
							<ul className={styles.list}>
								{shownRecipes.map((recipe) => (
									<RecipeSummaryRow
										key={recipe.publicId}
										publicId={recipe.publicId}
										thumbnailSeed={recipe.publicId}
										cover={recipe.cover}
										name={recipe.name}
										yieldText={recipe.yieldText}
										extra={
											recipe.visibility === "private" ? null : (
												<Tag tone="soft">
													{recipeVisibilityLabels[recipe.visibility]}
												</Tag>
											)
										}
									/>
								))}
							</ul>
						</Card>
					)}
				</>
			)}
		</section>
	);
}
