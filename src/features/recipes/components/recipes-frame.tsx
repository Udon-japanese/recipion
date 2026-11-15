import { type HistoryState, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ButtonLink } from "#/components/button/button-link";
import * as fabStyles from "#/components/fab/fab.css";
import { Icon } from "#/components/icon/icon";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import * as styles from "./recipes-frame.css";

export type RecipesTab = "mine" | "public";

type RecipesFrameProps = {
	// 自分のレシピ（/recipes）か、みんなのレシピ（/recipes/public）か。
	tab: RecipesTab;
	onTabChange: (tab: RecipesTab) => void;
	// 「つくった記録」へ移るとき、履歴に引き継ぐ state（それぞれの検索の条件）。
	carryState: (prev: HistoryState) => HistoryState;
	children: ReactNode;
};

// レシピの画面の枠：題名・つくった記録・登録と、自分のレシピ／みんなのレシピの切り替え。
export function RecipesFrame({
	tab,
	onTabChange,
	carryState,
	children,
}: RecipesFrameProps) {
	return (
		<section className={styles.container}>
			<div className={styles.titleRow}>
				<h2 className={styles.title}>レシピ</h2>
				<div className={styles.titleActions}>
					<ButtonLink
						to="/recipes/made"
						state={carryState}
						variant="secondary"
						size="sm"
						leadingIcon={<Icon name="calendar" size={16} />}
					>
						つくった記録
					</ButtonLink>
					{/* 広い画面だけ。スマホは、右下の＋（ほかの画面と同じ）。 */}
					<span className={styles.wideOnly}>
						<ButtonLink to="/recipes/new" size="sm">
							レシピを登録
						</ButtonLink>
					</span>
				</div>
			</div>
			<Link
				to="/recipes/new"
				className={`${fabStyles.fab} ${fabStyles.fabCorner}`}
				aria-label="レシピを登録"
			>
				<Icon name="plus" size={24} />
			</Link>

			<SegmentedControl
				label="表示するレシピ"
				value={tab}
				onChange={onTabChange}
				options={[
					{ value: "mine", label: "自分のレシピ", icon: "book" },
					{ value: "public", label: "みんなのレシピ", icon: "users" },
				]}
			/>

			{children}
		</section>
	);
}

// つくった記録の枠。レシピの集まりではなく、日付ごとの履歴なので、切り替えに入れず、別の画面にする（戻るリンクつき）。
// 戻るリンクは、履歴の state（それぞれの検索の条件）を引き継ぐ。
export function RecipeMadeFrame({ children }: { children: ReactNode }) {
	return (
		<section className={styles.container}>
			<div className={styles.backRow}>
				<ButtonLink
					to="/recipes"
					state
					variant="ghost"
					size="sm"
					leadingIcon={<Icon name="chevron-left" size={16} />}
				>
					レシピ
				</ButtonLink>
			</div>
			<h2 className={styles.title}>つくった記録</h2>
			{children}
		</section>
	);
}
