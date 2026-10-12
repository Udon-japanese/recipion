import { useEffect, useState } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import type { RecipePickerContext } from "#/features/shopping/components/recipe-picker-slot";
import type { RecipeDetail } from "../application/recipe-repository";
import { filterLinkTargets } from "../domain/filter-link-targets";
import type { RecipeLinkTarget } from "../domain/recipe-links";
import { RecipeShoppingSection } from "./recipe-shopping-section";
import * as styles from "./recipe-shopping-section.css";

type RecipeToShoppingPickerProps = {
	context: RecipePickerContext;
	ownerScope: InventoryPurchaseOwnerScope | null;
	// 自分のレシピの一覧。
	listRecipes: () => Promise<RecipeLinkTarget[]>;
	// レシピの中身（材料）。リンク先のレシピの展開にも使う。
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>;
	loadInventoryItems: () => Promise<InventoryListItem[]>;
	registerAvailable?: (ingredientName: string) => Promise<void>;
};

const maxListedRecipes = 50;

// 買い物メモの画面で、レシピを選んで、足りない材料を入れる。選べるのは、自分のレシピだけ
// （他の人のレシピから入れる機能は、今後対応する予定）。
export function RecipeToShoppingPicker({
	context,
	ownerScope,
	listRecipes,
	loadRecipe,
	loadInventoryItems,
	registerAvailable,
}: RecipeToShoppingPickerProps) {
	const [recipes, setRecipes] = useState<RecipeLinkTarget[] | null>(null);
	const [query, setQuery] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isOpeningRecipe, setIsOpeningRecipe] = useState(false);
	const [selected, setSelected] = useState<RecipeDetail | null>(null);

	useEffect(() => {
		let isActive = true;

		listRecipes().then(
			(loaded) => {
				if (isActive) {
					setRecipes(loaded);
				}
			},
			() => {
				if (isActive) {
					setErrorMessage("レシピの一覧を読み込めませんでした");
				}
			},
		);

		return () => {
			isActive = false;
		};
	}, [listRecipes]);

	async function handleSelect(publicId: string) {
		setIsOpeningRecipe(true);
		setErrorMessage(null);

		try {
			const recipe = await loadRecipe(publicId);

			if (recipe) {
				setSelected(recipe);
			} else {
				setErrorMessage("レシピが見つかりませんでした");
			}
		} catch {
			setErrorMessage("レシピを読み込めませんでした");
		} finally {
			setIsOpeningRecipe(false);
		}
	}

	if (selected) {
		return (
			<div>
				<p className={styles.hint}>「{selected.name}」の材料</p>
				<button
					className={styles.smallButton}
					type="button"
					onClick={() => setSelected(null)}
				>
					別のレシピを選ぶ
				</button>
				<RecipeShoppingSection
					ingredients={selected.ingredients}
					linkViews={selected.linkViews}
					loadLinkedRecipe={loadRecipe}
					ownerScope={ownerScope}
					loadInventoryItems={loadInventoryItems}
					registerAvailable={registerAvailable}
					shoppingRepository={context.repository}
					embedded={{
						onClose: context.onClose,
						destination: context.destination,
						onApplied: () => context.onApplied(selected.name),
					}}
				/>
			</div>
		);
	}

	const shown = recipes
		? filterLinkTargets(recipes, query, maxListedRecipes)
		: [];

	return (
		<section className={styles.container} aria-label="レシピから入れる">
			<div className={styles.panel}>
				<h3 className={styles.heading}>レシピから入れる</h3>
				<p className={styles.hint}>
					自分のレシピから選べます。他の人のレシピから入れる機能は、今後対応する予定です。
				</p>

				<div className={styles.field}>
					<label className={styles.label} htmlFor="recipe-picker-query">
						レシピの名前で絞り込む
					</label>
					<input
						className={styles.select}
						id="recipe-picker-query"
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>

				{recipes === null && !errorMessage ? (
					<p className={styles.hint}>読み込んでいます…</p>
				) : null}

				{recipes && recipes.length === 0 ? (
					<p className={styles.hint}>登録したレシピがまだありません。</p>
				) : null}

				{recipes && recipes.length > 0 && shown.length === 0 ? (
					<p className={styles.hint}>合うレシピがありません。</p>
				) : null}

				<ul className={styles.list}>
					{shown.map((recipe) => (
						<li className={styles.row} key={recipe.publicId}>
							<button
								className={styles.smallButton}
								type="button"
								disabled={isOpeningRecipe}
								onClick={() => void handleSelect(recipe.publicId)}
							>
								{recipe.name}
							</button>
						</li>
					))}
				</ul>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}

				<div className={styles.actions}>
					<button
						className={styles.cancelButton}
						type="button"
						onClick={context.onClose}
					>
						閉じる
					</button>
				</div>
			</div>
		</section>
	);
}
