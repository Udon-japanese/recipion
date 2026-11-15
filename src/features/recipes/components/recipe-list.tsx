import { useRef, useState } from "react";
import { Card } from "#/components/card/card";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, SearchInput } from "#/components/field/field";
import { Mascot } from "#/components/mascot/mascot";
import { Tag } from "#/components/tag/tag";
import type { RecipeSummary } from "../application/recipe-repository";
import {
	collectOwnRecipeTags,
	filterOwnRecipes,
	isSameOwnRecipeTagFilter,
	type OwnRecipeTagFilter,
} from "../domain/filter-own-recipes";
import { maxSearchQueryLength } from "../domain/public-recipe-search";
import { publicRecipeTagLabel } from "../domain/recipe-tags";
import { recipeVisibilityLabels } from "../domain/recipe-visibility-label";
import * as styles from "./recipe-list.css";
import { RecipeSummaryRow } from "./recipe-summary-row";

type RecipeListProps = {
	recipes: readonly RecipeSummary[];
	// 自分のレシピの検索語と、絞り込みのタグ（履歴に持つ。切り替えて戻っても残る）。
	query: string;
	// 検索語が変わったとき（変換中は、確定したあとに1回だけ）。
	onQueryChange: (query: string) => void;
	tagFilters: readonly OwnRecipeTagFilter[];
	onTagFiltersChange: (filters: OwnRecipeTagFilter[]) => void;
	// 条件を読み直したときに変わる値（履歴の項目・持ち主が変わったとき）。変わったら、欄を query に戻す。
	restoreKey?: string;
	// 履歴の条件を、まだ読めない（画面が動き出す前）。その間は、一覧を描かない（全件が一瞬見えないように）。
	isRestoring?: boolean;
};

// 自分のレシピの一覧と、画面の中での絞り込み（検索語・タグ）。
export function RecipeList({
	recipes,
	query,
	onQueryChange,
	tagFilters,
	onTagFiltersChange,
	restoreKey = "",
	isRestoring = false,
}: RecipeListProps) {
	const [searchText, setSearchText] = useState(query);
	const [restoredFor, setRestoredFor] = useState(restoreKey);

	// 戻る・進む、画面が動き出したときなどに、履歴の条件を、欄に入れ直す（打つたびには変わらない）。
	if (restoredFor !== restoreKey) {
		setRestoredFor(restoreKey);
		setSearchText(query);
	}
	// 変換中（IME）かどうか。変換中は履歴を更新せず、確定のときに1回だけ反映する。
	const composingRef = useRef(false);
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
		tagOptions.some((option) =>
			isSameOwnRecipeTagFilter(option.filter, filter),
		),
	);
	const shownRecipes = filterOwnRecipes(recipes, searchText, activeTagFilters);

	function toggleTagFilter(filter: OwnRecipeTagFilter) {
		onTagFiltersChange(
			activeTagFilters.some((selected) =>
				isSameOwnRecipeTagFilter(selected, filter),
			)
				? activeTagFilters.filter(
						(selected) => !isSameOwnRecipeTagFilter(selected, filter),
					)
				: [...activeTagFilters, filter],
		);
	}

	if (isRestoring) {
		return (
			<output className={styles.empty}>
				<Mascot size={64} motion="loop" />
				よみこみ中...
			</output>
		);
	}

	if (recipes.length === 0) {
		return (
			<div className={styles.empty}>
				<Mascot size={64} motion="still" />
				<p className={styles.emptyText}>レシピはまだありません。</p>
			</div>
		);
	}

	return (
		<>
			<search className={styles.search}>
				<Field label="自分のレシピを探す" hideLabel>
					{(control) => (
						<SearchInput
							{...control}
							value={searchText}
							maxLength={maxSearchQueryLength}
							placeholder="レシピ名で探す"
							onChange={(event) => {
								setSearchText(event.target.value);
								if (!composingRef.current) {
									onQueryChange(event.target.value);
								}
							}}
							onCompositionStart={() => {
								composingRef.current = true;
							}}
							onCompositionEnd={(event) => {
								composingRef.current = false;
								onQueryChange(event.currentTarget.value);
							}}
						/>
					)}
				</Field>
				{tagOptions.length > 0 ? (
					<ChipGroup label="タグで絞り込む">
						{tagOptions.map((option) => (
							<Chip
								key={`${option.filter.kind}:${option.filter.tag}`}
								pressed={activeTagFilters.some((selected) =>
									isSameOwnRecipeTagFilter(selected, option.filter),
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
	);
}
