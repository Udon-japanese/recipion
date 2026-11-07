import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { Card } from "#/components/card/card";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, TextInput } from "#/components/field/field";
import { Mascot } from "#/components/mascot/mascot";
import { useMediaQuery } from "#/components/use-media-query";
import { UserFacingError } from "#/errors/user-facing-error";
import type { PublicRecipePage } from "../domain/public-recipe-search";
import { maxSearchQueryLength } from "../domain/public-recipe-search";
import {
	type PublicRecipeTag,
	publicRecipeTagLabel,
	recipeTagLimits,
	sortPublicRecipeTags,
} from "../domain/recipe-tags";
import * as styles from "./public-recipe-list.css";
import { PublicRecipeTagChips } from "./public-recipe-tag-chips";
import { RecipeDialog } from "./recipe-dialog";
import { RecipeSummaryRow } from "./recipe-summary-row";

type PublicRecipeListProps = {
	// 検索の欄の初期値と、最初のページ。
	query: string;
	// 絞り込みに選んだ公開用のタグ（すべてを持つレシピだけ）。
	tags: readonly PublicRecipeTag[];
	initialPage: PublicRecipePage;
	onSearch: (query: string, tags: PublicRecipeTag[]) => void;
	// 続きのページ。
	loadMore: (cursor: string) => Promise<PublicRecipePage>;
};

// みんなのレシピ（全体公開）の一覧と検索。
export function PublicRecipeList({
	query,
	tags,
	initialPage,
	onSearch,
	loadMore,
}: PublicRecipeListProps) {
	const [searchText, setSearchText] = useState(query);
	const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
	const isWide = useMediaQuery("(min-width: 768px)");
	// シートで選んでいる途中のタグ（「この条件で探す」で決める）。
	const [draftTags, setDraftTags] = useState<PublicRecipeTag[]>([...tags]);
	const [recipes, setRecipes] = useState(initialPage.recipes);
	const [cursor, setCursor] = useState(initialPage.nextCursor);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function handleSearch(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		onSearch(searchText.trim(), [...tags]);
	}

	function openTagSheet() {
		setDraftTags([...tags]);
		setIsTagSheetOpen(true);
	}

	function toggleDraftTag(tag: PublicRecipeTag) {
		setDraftTags((current) =>
			current.includes(tag)
				? current.filter((selected) => selected !== tag)
				: sortPublicRecipeTags([...current, tag]),
		);
	}

	async function handleLoadMore() {
		if (cursor === null || isLoading) return;

		setIsLoading(true);
		setErrorMessage(null);

		try {
			const page = await loadMore(cursor);

			setRecipes((current) => {
				const known = new Set(current.map((recipe) => recipe.publicId));

				return [
					...current,
					...page.recipes.filter((recipe) => !known.has(recipe.publicId)),
				];
			});
			setCursor(page.nextCursor);
		} catch (error) {
			setErrorMessage(
				error instanceof UserFacingError
					? error.message
					: "続きを読み込めませんでした。もう一度、お試しください。",
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className={styles.container}>
			<search className={styles.search}>
				<form className={styles.searchForm} onSubmit={handleSearch}>
					<div className={styles.searchField}>
						<Field label="レシピを探す" hideLabel>
							{(control) => (
								<TextInput
									{...control}
									type="search"
									value={searchText}
									maxLength={maxSearchQueryLength}
									placeholder="レシピ名・材料で探す（空欄なら新しい順）"
									onChange={(event) => setSearchText(event.target.value)}
								/>
							)}
						</Field>
					</div>
					<Button type="submit" size="sm">
						探す
					</Button>
				</form>
				<ChipGroup label="タグで絞り込む">
					<Chip icon="sliders" onClick={openTagSheet}>
						タグで絞る
					</Chip>
					{tags.map((tag) => (
						<Chip
							key={tag}
							pressed
							aria-label={`${publicRecipeTagLabel(tag)}の絞り込みを外す`}
							onClick={() =>
								onSearch(
									query,
									tags.filter((selected) => selected !== tag),
								)
							}
						>
							{publicRecipeTagLabel(tag)}
						</Chip>
					))}
				</ChipGroup>
			</search>

			<RecipeDialog
				open={isTagSheetOpen}
				onOpenChange={setIsTagSheetOpen}
				title="タグで絞る"
				narrow
				footer={
					<Button
						size={isWide ? "lg" : "md"}
						fullWidth={!isWide}
						onClick={() => {
							setIsTagSheetOpen(false);
							onSearch(query, draftTags);
						}}
					>
						この条件で探す
					</Button>
				}
			>
				<div className={styles.tagSheetBody}>
					<p className={styles.tagSheetHint}>
						選んだタグを、すべて持つレシピを探します（
						{recipeTagLimits.maxSearchTags}つまで）。
					</p>
					<PublicRecipeTagChips
						selected={draftTags}
						max={recipeTagLimits.maxSearchTags}
						onToggle={toggleDraftTag}
					/>
				</div>
			</RecipeDialog>

			{recipes.length === 0 ? (
				<div className={styles.empty}>
					<Mascot size={64} motion="still" />
					<p className={styles.emptyText}>
						{query === "" && tags.length === 0
							? "まだ、ほかの人が公開したレシピはありません。"
							: query === ""
								? "選んだタグに合うレシピは見つかりませんでした。"
								: `「${query}」に合うレシピは見つかりませんでした。`}
					</p>
				</div>
			) : (
				<Card>
					<ul className={styles.list}>
						{recipes.map((recipe) => (
							<RecipeSummaryRow
								key={recipe.publicId}
								publicId={recipe.publicId}
								thumbnailSeed={recipe.publicId}
								cover={recipe.cover}
								name={recipe.name}
								yieldText={recipe.yieldText}
								author={{
									name: recipe.authorName,
									handle: recipe.authorHandle,
									avatar: recipe.authorAvatar,
								}}
							/>
						))}
					</ul>
				</Card>
			)}

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{cursor !== null ? (
				<Button
					type="button"
					variant="secondary"
					fullWidth
					status={isLoading ? "pending" : "idle"}
					pendingLabel="読み込み中"
					onClick={handleLoadMore}
				>
					もっと見る
				</Button>
			) : null}
		</div>
	);
}
