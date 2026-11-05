import { useState } from "react";
import { Button } from "#/components/button/button";
import { Card } from "#/components/card/card";
import { Mascot } from "#/components/mascot/mascot";
import { UserFacingError } from "#/errors/user-facing-error";
import {
	formatCookDate,
	groupRecipeCooksByDate,
	type RecipeCookPage,
} from "../domain/recipe-cook-log";
import * as styles from "./recipe-cook-list.css";
import { RecipeSummaryRow } from "./recipe-summary-row";

type RecipeCookListProps = {
	initialPage: RecipeCookPage;
	// 続きのページ。
	loadMore: (cursor: string) => Promise<RecipeCookPage>;
};

// 「つくった！」を押したレシピの一覧（新しい順、日付ごと）。
export function RecipeCookList({ initialPage, loadMore }: RecipeCookListProps) {
	const [entries, setEntries] = useState(initialPage.entries);
	const [cursor, setCursor] = useState(initialPage.nextCursor);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleLoadMore() {
		if (cursor === null || isLoading) {
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);

		try {
			const page = await loadMore(cursor);

			setEntries((current) => {
				const known = new Set(current.map((entry) => entry.id));

				return [
					...current,
					...page.entries.filter((entry) => !known.has(entry.id)),
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

	if (entries.length === 0) {
		return (
			<div className={styles.empty}>
				<Mascot size={64} motion="still" />
				<p className={styles.emptyText}>
					レシピの「つくった！」を押すと、ここに並びます。
				</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			{groupRecipeCooksByDate(entries).map((day) => {
				const titleId = `cook-day-${day.date}`;

				return (
					<section
						className={styles.day}
						key={day.date}
						aria-labelledby={titleId}
					>
						<h3 className={styles.dayTitle} id={titleId}>
							{formatCookDate(day.date)}
						</h3>
						<Card>
							<ul className={styles.list}>
								{day.entries.map((entry) => (
									<RecipeSummaryRow
										key={entry.id}
										publicId={entry.publicId}
										thumbnailSeed={entry.publicId ?? entry.id}
										cover={entry.cover}
										name={entry.recipeName}
										servings={entry.servings}
										author={entry.author}
										extra={
											entry.publicId ? null : (
												<span>削除された（または見られなくなった）レシピ</span>
											)
										}
									/>
								))}
							</ul>
						</Card>
					</section>
				);
			})}

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
