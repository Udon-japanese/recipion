import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import type { ShoppingRepository } from "#/features/shopping/application/shopping-repository";
import type { ShoppingItem } from "#/features/shopping/domain/shopping-item";
import {
	buildShoppingChanges,
	type ShoppingDestination,
} from "../application/build-shopping-changes";
import {
	type LinkedShoppingSections,
	loadLinkedShoppingSections,
} from "../application/load-linked-shopping-sections";
import type { RecipeDetail } from "../application/recipe-repository";
import { resolveIngredientLinks } from "../domain/link-ingredient-needs";
import { mergeRecipeNeeds } from "../domain/merge-recipe-needs";
import {
	type DuplicateMode,
	flattenRecipeIngredients,
	planShoppingFromRecipe,
	type RecipeShoppingRow,
} from "../domain/plan-shopping-from-recipe";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";

const noLinkViews: readonly RecipeLinkView[] = [];
const noLinkedSections: LinkedShoppingSections = {
	sections: [],
	failedNames: [],
};

type UseRecipeShoppingPlanOptions = {
	ingredients: readonly RecipeEditorIngredientNode[];
	// 材料の [[ラベル]] の、リンク先。リンク先が見つからない材料は、候補にしない。
	linkViews?: readonly RecipeLinkView[];
	// リンク先のレシピを取ってくる。リンクした材料は、そのレシピの材料を、展開して判定する。
	loadLinkedRecipe?: (publicId: string) => Promise<RecipeDetail | null>;
	ownerScope: InventoryPurchaseOwnerScope | null;
	// ログインしているとき、在庫の一覧を取得する（ゲストでは、呼ばない）。
	loadInventoryItems?: () => Promise<InventoryListItem[]>;
	shoppingRepository: ShoppingRepository;
	// 入れ先。省略は通常のメモ。条件つきのメモの側にも入れられる。
	destination?: ShoppingDestination;
	// 入れたあとに呼ぶ（買い物メモの画面が、一覧を読み直す）。
	onApplied?: () => void;
	// 渡すと、この値が変わるたびに、自動で読み込みを始める（null は、まだ始めない）。
	autoStartKey?: string | null;
};

// レシピの材料を、在庫と比べて、足りないものを、買い物メモに入れる計画（状態と操作）。
// 人数による量の調整はしない（レシピの量のまま）。
export function useRecipeShoppingPlan({
	ingredients,
	linkViews = noLinkViews,
	loadLinkedRecipe,
	ownerScope,
	loadInventoryItems,
	shoppingRepository,
	destination,
	onApplied,
	autoStartKey = null,
}: UseRecipeShoppingPlanOptions) {
	// 入れ先を考えた、新しい項目の並び順の起点（全項目の最大値）。
	const [highestSortOrder, setHighestSortOrder] = useState(-1);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultMessage, setResultMessage] = useState<string | null>(null);
	const [stockItems, setStockItems] = useState<InventoryListItem[] | null>(
		null,
	);
	const [memoItems, setMemoItems] = useState<ShoppingItem[]>([]);
	const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("max");
	// ユーザーが、初期のチェックを変えた行（食材の ID → チェックの有無）。
	const [checkedOverrides, setCheckedOverrides] = useState<
		Record<string, boolean>
	>({});
	const [isApplying, setIsApplying] = useState(false);
	const [linkedSections, setLinkedSections] =
		useState<LinkedShoppingSections>(noLinkedSections);

	// リンクの材料は、リンク先のレシピの材料に置き換える（リンク先の材料は、開いたときに取ってくる）。
	const resolvedNeeds = useMemo(
		() =>
			resolveIngredientLinks(flattenRecipeIngredients(ingredients), linkViews),
		[ingredients, linkViews],
	);

	// 同じ食材の行（「オリーブオイル 大さじ1」と「オリーブオイル 少し」など）は、1行にまとめる。
	const needs = useMemo(
		() =>
			mergeRecipeNeeds([
				...resolvedNeeds.filter((need) => !need.linkedRecipe),
				...linkedSections.sections.flatMap((section) => section.needs),
			]),
		[resolvedNeeds, linkedSections],
	);

	// 未購入の買い物項目だけを、重複の対象にする。
	const unpurchasedMemoItems = useMemo(
		() => memoItems.filter((item) => item.status !== "purchased"),
		[memoItems],
	);

	const rows = useMemo(
		() =>
			planShoppingFromRecipe({
				needs,
				stockItems,
				memoItems: unpurchasedMemoItems.map((item) => ({
					id: item.id,
					name: item.name,
					quantity: item.quantity,
					unitLabel: item.unitLabel,
				})),
				duplicateMode,
			}),
		[needs, stockItems, unpurchasedMemoItems, duplicateMode],
	);

	const isChecked = (row: RecipeShoppingRow): boolean =>
		row.plan === "keep"
			? false
			: (checkedOverrides[row.need.id] ?? row.defaultChecked);

	const selectedNeedIds = new Set(
		rows.filter(isChecked).map((row) => row.need.id),
	);

	// 重複の判定に使う項目。通常のメモに入れるときは、条件つきのメモの中の項目を除く
	// （まだ買うと決まっていないため）。条件つきのメモの側に入れるときは、その側の項目だけ。
	const loadMemoItems = useCallback(async () => {
		const all = await shoppingRepository.list();

		setHighestSortOrder(
			all.reduce((highest, item) => Math.max(highest, item.sortOrder), -1),
		);

		return destination
			? all.filter(
					(item) =>
						item.branchId === destination.branchId &&
						item.branchSide === destination.side,
				)
			: all.filter((item) => !item.branchId);
	}, [destination, shoppingRepository]);

	const load = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage(null);

		try {
			setMemoItems(await loadMemoItems());
		} catch {
			setErrorMessage("買い物メモを読み込めませんでした");
		}

		if (ownerScope && ownerScope !== "guest" && loadInventoryItems) {
			try {
				setStockItems(await loadInventoryItems());
			} catch {
				setStockItems(null);
				setErrorMessage(
					"在庫を読み込めませんでした。在庫の情報なしとして、表示しています",
				);
			}
		} else {
			setStockItems(null);
		}

		if (loadLinkedRecipe && resolvedNeeds.some((need) => need.linkedRecipe)) {
			const result = await loadLinkedShoppingSections(
				resolvedNeeds,
				loadLinkedRecipe,
			);

			setLinkedSections(result);

			if (result.failedNames.length > 0) {
				setErrorMessage(
					`${result.failedNames.join("、")}の材料を読み込めませんでした`,
				);
			}
		}

		setIsLoading(false);
	}, [
		loadInventoryItems,
		loadLinkedRecipe,
		loadMemoItems,
		ownerScope,
		resolvedNeeds,
	]);

	// 選び直し・開き直しのとき、前の結果と、チェックの変更を消して、読み込む。
	const start = useCallback(async () => {
		setResultMessage(null);
		setCheckedOverrides({});
		setLinkedSections(noLinkedSections);
		await load();
	}, [load]);

	// autoStartKey が変わったら（レシピを選んだら）、一度だけ読み込む。
	const startedKey = useRef<string | null>(null);

	useEffect(() => {
		if (autoStartKey === null) {
			startedKey.current = null;

			return;
		}

		if (startedKey.current !== autoStartKey) {
			startedKey.current = autoStartKey;
			void start();
		}
	}, [autoStartKey, start]);

	async function apply() {
		const changes = buildShoppingChanges(
			rows,
			selectedNeedIds,
			memoItems,
			undefined,
			{ destination, highestSortOrder },
		);

		if (changes.created.length === 0 && changes.updated.length === 0) {
			setResultMessage("買い物メモに入れるものが、選ばれていません");

			return;
		}

		setIsApplying(true);
		setErrorMessage(null);

		try {
			await shoppingRepository.saveAll([
				...changes.created,
				...changes.updated,
			]);

			setResultMessage(
				[
					changes.created.length > 0
						? `${changes.created.length}件を追加`
						: null,
					changes.updated.length > 0
						? `${changes.updated.length}件の数量を更新`
						: null,
				]
					.filter(Boolean)
					.join("、"),
			);
			setCheckedOverrides({});
			setMemoItems(await loadMemoItems());
			onApplied?.();
		} catch {
			setErrorMessage(
				"買い物メモに保存できませんでした。もう一度お試しください",
			);
		} finally {
			setIsApplying(false);
		}
	}

	function setChecked(row: RecipeShoppingRow, checked: boolean) {
		setCheckedOverrides((current) => ({
			...current,
			[row.need.id]: checked,
		}));
	}

	async function registerAvailableFor(
		register: ((ingredientName: string) => Promise<void>) | undefined,
		ingredientName: string,
	) {
		if (!register) {
			return;
		}

		setErrorMessage(null);

		try {
			await register(ingredientName);
			await load();
		} catch {
			setErrorMessage("在庫に登録できませんでした。通信を確認してください");
		}
	}

	return {
		needsCount: resolvedNeeds.length,
		rows,
		isChecked,
		setChecked,
		selectedCount: selectedNeedIds.size,
		duplicateMode,
		setDuplicateMode,
		isLoading,
		isApplying,
		errorMessage,
		resultMessage,
		start,
		apply,
		registerAvailableFor,
	};
}
