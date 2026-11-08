import { useEffect, useState } from "react";
import { Field, TextInput } from "#/components/field/field";
import {
	FloatingPanel,
	floatingPanelWidth,
} from "#/components/floating-panel/floating-panel";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { Note } from "#/components/note/note";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import type { IngredientDictionary } from "#/features/ingredients/domain/ingredient-dictionary";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import type { RecipePickerContext } from "#/features/shopping/components/recipe-picker-slot";
import type { RecipeDetail } from "../application/recipe-repository";
import { filterLinkTargets } from "../domain/filter-link-targets";
import { resolveWantedYield } from "../domain/household-size";
import type { RecipeLinkTarget } from "../domain/recipe-links";
import { describeShoppingAmount, ratioForYield } from "../domain/recipe-yield";
import {
	RecipeShoppingFooter,
	RecipeShoppingRows,
} from "./recipe-shopping-rows";
import * as styles from "./recipe-to-shopping-picker.css";
import { useRecipeShoppingPlan } from "./use-recipe-shopping-plan";

type RecipeToShoppingPickerProps = {
	context: RecipePickerContext;
	ownerScope: InventoryPurchaseOwnerScope | null;
	// 自分のレシピの一覧。
	listRecipes: () => Promise<RecipeLinkTarget[]>;
	// レシピの中身（材料）。リンク先のレシピの展開にも使う。
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>;
	loadInventoryItems: () => Promise<InventoryListItem[]>;
	registerAvailable?: (ingredientName: string) => Promise<void>;
	// 材料を「管理しない材料」にする（水など）。ゲストは省略。
	markUnmanaged?: (ingredientName: string) => Promise<void>;
	// うちの人数（設定）を読む。「人分」のレシピは、その人数の量で入れる。なければ、レシピの量のまま。
	loadHouseholdSize?: () => Promise<number | null>;
	// ユーザーの食材辞書（照合に使う）。ゲストは省略。
	dictionary?: IngredientDictionary;
};

const maxListedRecipes = 50;

// 買い物メモの画面で、レシピを選んで、足りない材料を入れる。選べるのは、自分のレシピだけ
// （他の人のレシピから入れる機能は、今後対応する予定）。
// 浮いたパネルなので、後ろのメモを見ながら、続けて別のレシピも入れられる。
export function RecipeToShoppingPicker({
	context,
	ownerScope,
	listRecipes,
	loadRecipe,
	loadInventoryItems,
	registerAvailable,
	markUnmanaged,
	loadHouseholdSize,
	dictionary,
}: RecipeToShoppingPickerProps) {
	const isWide = useMediaQuery("(min-width: 768px)");
	const [recipes, setRecipes] = useState<RecipeLinkTarget[] | null>(null);
	const [query, setQuery] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isOpeningRecipe, setIsOpeningRecipe] = useState(false);
	const [selected, setSelected] = useState<RecipeDetail | null>(null);
	const [householdSize, setHouseholdSize] = useState<number | null>(null);
	// 入れる量の割合（うちの人数を使う「人分」のレシピだけ。ほかは、レシピの量のまま）。
	const wanted = selected
		? resolveWantedYield({
				recipe: selected,
				urlWanted: undefined,
				householdSize,
			})
		: undefined;
	const ratio = selected ? ratioForYield(selected.yieldText, wanted) : 1;

	const plan = useRecipeShoppingPlan({
		ingredients: selected?.ingredients ?? [],
		linkViews: selected?.linkViews,
		loadLinkedRecipe: loadRecipe,
		ownerScope,
		loadInventoryItems,
		shoppingRepository: context.repository,
		destination: context.destination,
		dictionary,
		onApplied: () => {
			if (selected) {
				context.onApplied(selected.name);
			}
		},
		// うちの人数を読み終えて、割合が変わったときも、数え直す。
		autoStartKey: selected ? `${selected.publicId}:${ratio}` : null,
		ratio,
	});

	useEffect(() => {
		if (!loadHouseholdSize) {
			return;
		}

		let isActive = true;

		// 読めなければ、レシピの量のまま入れる（知らせるほどのことではない）。
		loadHouseholdSize().then(
			(size) => {
				if (isActive) {
					setHouseholdSize(size);
				}
			},
			() => {},
		);

		return () => {
			isActive = false;
		};
	}, [loadHouseholdSize]);

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

	const shown = recipes
		? filterLinkTargets(recipes, query, maxListedRecipes)
		: [];

	const title = selected ? `${selected.name}の材料` : "レシピから入れる";
	const headerLeading = selected ? (
		<IconButton
			icon="chevron-left"
			label="別のレシピを選ぶ"
			size="std"
			tone="plain"
			disabled={plan.isApplying}
			onClick={() => setSelected(null)}
		/>
	) : null;
	const footer = selected ? (
		<RecipeShoppingFooter plan={plan} onClose={context.onClose} />
	) : undefined;
	const body = selected ? (
		<section aria-label="買い物メモに入れる">
			<RecipeShoppingRows
				plan={plan}
				ownerScope={ownerScope}
				registerAvailable={registerAvailable}
				markUnmanaged={markUnmanaged}
				amountNote={describeShoppingAmount(
					selected.yieldText,
					ratio,
					"うちの人数で、",
				)}
			/>
		</section>
	) : (
		<section className={styles.list} aria-label="レシピから入れる">
			<p className={styles.hint}>
				自分のレシピから選べます。他の人のレシピから入れる機能は、今後対応する予定です。
			</p>
			<Field label="レシピの名前で絞り込む" hideLabel>
				{(control) => (
					<TextInput
						{...control}
						type="search"
						value={query}
						placeholder="レシピの名前で絞り込む"
						onChange={(event) => setQuery(event.target.value)}
					/>
				)}
			</Field>
			{recipes === null && !errorMessage ? (
				<Note tone="info" spinning>
					読み込んでいます…
				</Note>
			) : null}
			{recipes && recipes.length === 0 ? (
				<p className={styles.hint}>登録したレシピがまだありません。</p>
			) : null}
			{recipes && recipes.length > 0 && shown.length === 0 ? (
				<p className={styles.hint}>合うレシピがありません。</p>
			) : null}
			{shown.length > 0 ? (
				<ul className={styles.recipeList}>
					{shown.map((recipe) => (
						<li key={recipe.publicId}>
							<button
								className={styles.recipeRow}
								type="button"
								disabled={isOpeningRecipe}
								onClick={() => void handleSelect(recipe.publicId)}
							>
								<span className={styles.recipeName}>{recipe.name}</span>
								<Icon name="chevron-right" size={20} />
							</button>
						</li>
					))}
				</ul>
			) : null}
			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
		</section>
	);

	function close() {
		if (!plan.isApplying) {
			context.onClose();
		}
	}

	// 浮いたパネル：後ろのメモを見ながら、続けて入れられる。PC は、見出しをつかんで動かせるパネル。
	if (isWide) {
		// 浮いたパネルには、閉じる動きがない。
		if (context.open === false) {
			return null;
		}

		return (
			<FloatingPanel
				title={title}
				headerLeading={headerLeading}
				footer={footer}
				getInitialPosition={() => ({
					x: window.innerWidth - floatingPanelWidth - 24,
					y: 24,
				})}
				onEscape={close}
				onClose={close}
			>
				{body}
			</FloatingPanel>
		);
	}

	return (
		<Sheet
			open={context.open ?? true}
			onOpenChange={(next) => {
				if (!next) {
					close();
				}
			}}
			title={title}
			modal={false}
			snapPoints={[0.7, 0.92]}
			defaultSnapIndex={0}
			headerLeading={headerLeading}
			footer={footer}
		>
			{body}
		</Sheet>
	);
}
