import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/button/button";
import { Icon } from "#/components/icon/icon";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import type { ShoppingRepository } from "#/features/shopping/application/shopping-repository";
import { dexieShoppingRepository } from "#/features/shopping/infrastructure/dexie-shopping-repository";
import type { RecipeDetail } from "../application/recipe-repository";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";
import { RecipeDialog } from "./recipe-dialog";
import { RecipeShoppingRows } from "./recipe-shopping-rows";
import * as styles from "./recipe-shopping-section.css";
import { useRecipeShoppingPlan } from "./use-recipe-shopping-plan";

type RecipeShoppingSectionProps = {
	ingredients: readonly RecipeEditorIngredientNode[];
	// 材料の [[ラベル]] の、リンク先。リンク先が見つからない材料は、候補にしない。
	linkViews?: readonly RecipeLinkView[];
	// リンク先のレシピを取ってくる。リンクした材料は、そのレシピの材料を、展開して判定する。
	loadLinkedRecipe?: (publicId: string) => Promise<RecipeDetail | null>;
	ownerScope: InventoryPurchaseOwnerScope | null;
	// ログインしているとき、在庫の一覧を取得する（ゲストでは、呼ばない）。
	loadInventoryItems?: () => Promise<InventoryListItem[]>;
	shoppingRepository?: ShoppingRepository;
	// 「ある」を押したとき、その食材を、在庫に「ある」で登録する（塩・醤油など）。
	registerAvailable?: (ingredientName: string) => Promise<void>;
};

// レシピの参照画面で、材料を、在庫と比べて、足りないものを、買い物メモに入れる（材料の見出しの右に置く）。
// 人数による量の調整はしない（レシピの量のまま）。
export function RecipeShoppingSection({
	ingredients,
	linkViews,
	loadLinkedRecipe,
	ownerScope,
	loadInventoryItems,
	shoppingRepository = dexieShoppingRepository,
	registerAvailable,
}: RecipeShoppingSectionProps) {
	const [isOpen, setIsOpen] = useState(false);
	const plan = useRecipeShoppingPlan({
		ingredients,
		linkViews,
		loadLinkedRecipe,
		ownerScope,
		loadInventoryItems,
		shoppingRepository,
	});

	if (plan.needsCount === 0) {
		return null;
	}

	return (
		<>
			<Button
				variant="secondary"
				size="sm"
				leadingIcon={<Icon name="shopping-bag" size={16} />}
				onClick={() => {
					setIsOpen(true);
					void plan.start();
				}}
			>
				買い物メモへ
			</Button>

			<RecipeDialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open && !plan.isApplying) {
						setIsOpen(false);
					}
				}}
				title="買い物メモに入れる"
				footer={
					<div className={styles.footer}>
						<Button
							variant="secondary"
							size="lg"
							fullWidth
							disabled={plan.isApplying}
							onClick={() => setIsOpen(false)}
						>
							閉じる
						</Button>

						<Button
							size="lg"
							fullWidth
							status={plan.isApplying ? "pending" : "idle"}
							pendingLabel="追加中"
							disabled={plan.isLoading}
							onClick={() => void plan.apply()}
						>
							{`選んだものを入れる（${plan.selectedCount}件）`}
						</Button>
					</div>
				}
			>
				<section aria-label="買い物メモに入れる">
					<RecipeShoppingRows
						plan={plan}
						ownerScope={ownerScope}
						registerAvailable={registerAvailable}
						resultLink={<Link to="/shopping">買い物メモを開く</Link>}
					/>
				</section>
			</RecipeDialog>
		</>
	);
}
