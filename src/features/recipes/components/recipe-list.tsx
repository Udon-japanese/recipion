import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ButtonLink } from "#/components/button/button-link";
import { Card } from "#/components/card/card";
import { Icon } from "#/components/icon/icon";
import {
	ListRow,
	ListRowMeta,
	ListRowName,
} from "#/components/list-row/list-row";
import { Mascot } from "#/components/mascot/mascot";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Tag } from "#/components/tag/tag";
import type { RecipeSummary } from "../application/recipe-repository";
import { recipeVisibilityLabels } from "../domain/recipe-visibility-label";
import * as styles from "./recipe-list.css";

export type RecipesTab = "mine" | "public";

type RecipeListProps = {
	recipes: readonly RecipeSummary[];
	tab?: RecipesTab;
	onTabChange?: (tab: RecipesTab) => void;
	// 「みんなのレシピ」の中身（tab が public のとき、自分のレシピの代わりに出す）。
	publicPanel?: ReactNode;
};

export function RecipeList({
	recipes,
	tab = "mine",
	onTabChange,
	publicPanel,
}: RecipeListProps) {
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
					]}
				/>
			) : null}

			{tab === "public" ? (
				publicPanel
			) : recipes.length === 0 ? (
				<div className={styles.empty}>
					<Mascot size={64} motion="still" />
					<p className={styles.emptyText}>レシピはまだありません。</p>
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
									{recipe.visibility === "private" ? null : (
										<Tag tone="soft">
											{recipeVisibilityLabels[recipe.visibility]}
										</Tag>
									)}
								</ListRowMeta>
							</ListRow>
						))}
					</ul>
				</Card>
			)}
		</section>
	);
}
