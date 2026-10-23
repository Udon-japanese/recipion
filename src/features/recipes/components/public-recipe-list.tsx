import { Link } from "@tanstack/react-router";
import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { Card } from "#/components/card/card";
import { Field, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import {
	ListRow,
	ListRowMeta,
	ListRowName,
} from "#/components/list-row/list-row";
import { Mascot } from "#/components/mascot/mascot";
import { Tag } from "#/components/tag/tag";
import { UserFacingError } from "#/errors/user-facing-error";
import type { PublicRecipePage } from "../domain/public-recipe-search";
import { maxSearchQueryLength } from "../domain/public-recipe-search";
import * as styles from "./public-recipe-list.css";

type PublicRecipeListProps = {
	// 検索の欄の初期値と、最初のページ。
	query: string;
	initialPage: PublicRecipePage;
	onSearch: (query: string) => void;
	// 続きのページ。
	loadMore: (cursor: string) => Promise<PublicRecipePage>;
};

// みんなのレシピ（全体公開）の一覧と検索。
export function PublicRecipeList({
	query,
	initialPage,
	onSearch,
	loadMore,
}: PublicRecipeListProps) {
	const [searchText, setSearchText] = useState(query);
	const [recipes, setRecipes] = useState(initialPage.recipes);
	const [cursor, setCursor] = useState(initialPage.nextCursor);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function handleSearch(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		onSearch(searchText.trim());
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
			<search>
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
			</search>

			{recipes.length === 0 ? (
				<div className={styles.empty}>
					<Mascot size={64} motion="still" />
					<p className={styles.emptyText}>
						{query === ""
							? "まだ、ほかの人が公開したレシピはありません。"
							: `「${query}」に合うレシピは見つかりませんでした。`}
					</p>
				</div>
			) : (
				<Card>
					<ul className={styles.list}>
						{recipes.map((recipe) => (
							<ListRow
								key={recipe.publicId}
								actions={<Icon name="chevron-right" size={20} />}
							>
								<Link
									className={styles.link}
									to="/recipes/$publicId"
									params={{ publicId: recipe.publicId }}
								>
									<ListRowName>{recipe.name}</ListRowName>
								</Link>
								<ListRowMeta>
									<Tag>{recipe.servings}人分</Tag>
									<Tag tone="soft">材料{recipe.ingredientCount}</Tag>
									<span className={styles.author}>
										{recipe.authorName}（@{recipe.authorHandle}）
									</span>
								</ListRowMeta>
							</ListRow>
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
