import { useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import {
	formatQuantity,
	formatQuantityForUnit,
} from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ParsedShoppingMemoLine } from "../domain/parse-shopping-memo";
import type { CreateShoppingBranchInput } from "../domain/shopping-branch";
import {
	getShoppingBranchConditionItem,
	getShoppingBranchSideItems,
	type ShoppingBranch,
	type ShoppingBranchSide,
} from "../domain/shopping-branch";
import type { ShoppingConversionDefaults } from "../domain/shopping-conversion-default";
import type {
	CreateShoppingItemInput,
	ShoppingItem,
	UpdateShoppingItemInput,
} from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import type { RenderRecipePicker } from "./recipe-picker-slot";
import {
	type BranchCardSide,
	type BranchCardView,
	ShoppingBranchCard,
} from "./shopping-branch-card";
import {
	type BranchConditionValue,
	ShoppingBranchConditionEditor,
} from "./shopping-branch-condition-editor";
import { ShoppingBulkAdd } from "./shopping-bulk-add";
import { ShoppingItemForm } from "./shopping-item-form";
import * as styles from "./shopping-page.css";

// 条件つきのメモを扱う操作と、まわりの情報（一覧の画面から渡す）。
export type ShoppingBranchCardsContext = {
	// 分岐の中の項目も含む、すべての項目。
	items: readonly ShoppingItem[];
	stores: readonly ShoppingStore[];
	// 食材ごとの、在庫換算の記憶（「まとめて追加」で、数量のない行に単位を補う）。
	conversionDefaults?: ShoppingConversionDefaults;
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onRemoveBranch: (branch: ShoppingBranch) => Promise<boolean>;
	onDecide: (
		branch: ShoppingBranch,
		side: ShoppingBranchSide,
	) => Promise<boolean>;
	onAddItem: (
		branch: ShoppingBranch,
		side: ShoppingBranchSide,
		input: CreateShoppingItemInput,
	) => Promise<boolean>;
	// 「まとめて追加」で確認した行を、その側に入れる。追加できた件数を返す。
	onAddItems: (
		branch: ShoppingBranch,
		side: ShoppingBranchSide,
		lines: readonly ParsedShoppingMemoLine[],
	) => Promise<number>;
	onRemoveItem: (itemId: string) => Promise<boolean>;
	// 条件（どんな時に）と、側の呼び名を直す。
	onUpdateBranch: (
		branch: ShoppingBranch,
		input: CreateShoppingBranchInput,
	) => Promise<boolean>;
	// 条件の材料を直す（成功したら、直した項目）。
	onUpdateItem: (
		item: ShoppingItem,
		input: UpdateShoppingItemInput,
	) => Promise<ShoppingItem | null>;
	// 「レシピから入れる」の部品（ログイン中だけ渡される）。
	renderRecipePicker?: RenderRecipePicker;
	// レシピの材料を、その側に入れたあと（呼び名の設定と、一覧の読み直しに使う）。
	onRecipeApplied?: (
		branch: ShoppingBranch,
		side: ShoppingBranchSide,
		recipeName: string,
	) => void;
	// レシピの材料を入れる先の、メモの保存先。
	repository?: ShoppingRepository;
};

type ShoppingBranchCardsProps = {
	branches: readonly ShoppingBranch[];
	context: ShoppingBranchCardsContext;
};

function sideTitle(label: string | null, fallback: string): string {
	return label ? `${fallback}（${label}）` : fallback;
}

// 条件の見出し：「{店}に{材料 数量}が{どんな時に}」（例：イオンに合い挽き 200gが売っていたら）。
// 数量が1で、単位もないときは、数量を書かない。店が決まっていなければ、「{店}に」は付けない。
function describeCondition(
	item: ShoppingItem | undefined,
	storeName: string | undefined,
	condition: string,
): string {
	if (!item) {
		return condition;
	}

	const quantity =
		item.unitLabel === null && item.quantity === 1
			? ""
			: ` ${formatQuantityForUnit(item.quantity, item.unitLabel)}${item.unitLabel ?? ""}`;

	return `${storeName ? `${storeName}に` : ""}${item.name}${quantity}が${condition}`;
}

function sideAddTitle(branch: ShoppingBranch, side: BranchCardSide): string {
	return `${
		side === "then"
			? sideTitle(branch.thenLabel, "そうなら")
			: sideTitle(branch.elseLabel, "そうでなければ")
	}`;
}

// 分類のカードの中に置く、条件つきのメモ（1つ1枚のカード）。
// ふだんはたたんで、条件・2つの側の件数・「そうだった／ちがった」。中身は、開いてタブで1側ずつ。
export function ShoppingBranchCards({
	branches,
	context,
}: ShoppingBranchCardsProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");
	// 「レシピから入れる」を開いている側。
	const [pickTarget, setPickTarget] = useState<{
		branch: ShoppingBranch;
		side: ShoppingBranchSide;
	} | null>(null);
	// 「追加」のシートを開いている側。
	const [addTarget, setAddTarget] = useState<{
		branch: ShoppingBranch;
		side: ShoppingBranchSide;
	} | null>(null);
	// 「まとめて追加」を開いている側。
	const [bulkTarget, setBulkTarget] = useState<{
		branch: ShoppingBranch;
		side: ShoppingBranchSide;
	} | null>(null);
	// 条件を編集している分岐。
	const [editingBranch, setEditingBranch] = useState<ShoppingBranch | null>(
		null,
	);
	const [removingBranch, setRemovingBranch] = useState<ShoppingBranch | null>(
		null,
	);
	const [isRemoving, setIsRemoving] = useState(false);
	const storeNamesById = new Map(
		context.stores.map((store) => [store.id, store.name]),
	);

	function toSideView(branch: ShoppingBranch, side: ShoppingBranchSide) {
		return {
			label: side === "then" ? branch.thenLabel : branch.elseLabel,
			items: getShoppingBranchSideItems(context.items, branch.id, side).map(
				(item) => ({
					id: item.id,
					name: item.name,
					amount: `${formatQuantityForUnit(item.quantity, item.unitLabel)}${item.unitLabel ?? ""}`,
					storeName: item.storeId
						? storeNamesById.get(item.storeId)
						: undefined,
				}),
			),
		};
	}

	function toCardView(branch: ShoppingBranch): BranchCardView {
		const conditionItem = getShoppingBranchConditionItem(
			context.items,
			branch.id,
		);
		const conditionStore = conditionItem?.storeId
			? storeNamesById.get(conditionItem.storeId)
			: undefined;

		return {
			condition: describeCondition(
				conditionItem,
				conditionStore,
				branch.condition,
			),
			ifTrue: toSideView(branch, "then"),
			ifFalse: toSideView(branch, "else"),
		};
	}

	const addTitle = addTarget
		? `${sideAddTitle(addTarget.branch, addTarget.side)}に追加`
		: "";
	const addFormId = "shopping-branch-side-form";
	const editingItem = editingBranch
		? getShoppingBranchConditionItem(context.items, editingBranch.id)
		: undefined;

	return (
		<>
			{branches.map((branch) => (
				<div className={styles.branchSlot} key={branch.id}>
					<ShoppingBranchCard
						branch={toCardView(branch)}
						onDecide={(side) => void context.onDecide(branch, side)}
						onEdit={() => setEditingBranch(branch)}
						onRemove={() => setRemovingBranch(branch)}
						onRemoveItem={(_side, itemId) => void context.onRemoveItem(itemId)}
						onAdd={(side) => setAddTarget({ branch, side })}
						onBulkAdd={(side) => setBulkTarget({ branch, side })}
						onAddFromRecipe={
							context.renderRecipePicker && context.repository
								? (side) => setPickTarget({ branch, side })
								: undefined
						}
					/>
				</div>
			))}

			{pickTarget && context.renderRecipePicker && context.repository
				? context.renderRecipePicker({
						repository: context.repository,
						destination: {
							branchId: pickTarget.branch.id,
							side: pickTarget.side,
						},
						onClose: () => setPickTarget(null),
						onApplied: (recipeName) =>
							context.onRecipeApplied?.(
								pickTarget.branch,
								pickTarget.side,
								recipeName,
							),
					})
				: null}

			<Sheet
				open={addTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setAddTarget(null);
					}
				}}
				title={addTitle}
				placement={isRight ? "right" : "bottom"}
				// 浮いたパネル：後ろのメモを見ながら、続けて入れられる（追加しても閉じない）。
				modal={false}
				snapPoints={isRight ? [0.92] : [0.1, 0.7, 0.92]}
				defaultSnapIndex={isRight ? 0 : 1}
				footer={
					<div className={styles.sheetFooter}>
						<Button
							variant="secondary"
							size="lg"
							fullWidth
							onClick={() => setAddTarget(null)}
						>
							完了
						</Button>

						<Button size="lg" fullWidth type="submit" form={addFormId}>
							この側に追加
						</Button>
					</div>
				}
			>
				{addTarget ? (
					<ShoppingItemForm
						alwaysExpanded
						hideSubmitButton
						formId={addFormId}
						errorMessage={null}
						stores={context.stores}
						defaultStoreIdFor={context.defaultStoreIdFor}
						onCreateStore={context.onCreateStore}
						onAdd={(input) =>
							context.onAddItem(addTarget.branch, addTarget.side, input)
						}
					/>
				) : null}
			</Sheet>

			{bulkTarget ? (
				<ShoppingBulkAdd
					title={`${sideAddTitle(bulkTarget.branch, bulkTarget.side)}にまとめて追加`}
					stores={context.stores}
					conversionDefaults={context.conversionDefaults}
					onClose={() => setBulkTarget(null)}
					onAdd={(lines) =>
						context.onAddItems(bulkTarget.branch, bulkTarget.side, lines)
					}
					onCreateStore={context.onCreateStore}
				/>
			) : null}

			{editingBranch && editingItem ? (
				<ShoppingBranchConditionEditor
					value={{
						storeId: editingItem.storeId,
						name: editingItem.name,
						quantity: formatQuantity(editingItem.quantity, {
							grouping: false,
						}),
						unitLabel: editingItem.unitLabel ?? "",
						categoryId: editingItem.categoryId ?? "",
						isCategoryManual: editingItem.categoryAssignment === "manual",
						presetConversion: null,
						condition: editingBranch.condition,
						thenLabel: editingBranch.thenLabel ?? "",
						elseLabel: editingBranch.elseLabel ?? "",
					}}
					stores={context.stores}
					onCreateStore={context.onCreateStore}
					onCancel={() => setEditingBranch(null)}
					onSave={async (draft) => {
						const isBranchSaved = await context.onUpdateBranch(editingBranch, {
							condition: draft.condition,
							thenLabel: draft.thenLabel,
							elseLabel: draft.elseLabel,
						});

						if (!isBranchSaved) {
							return false;
						}

						const updated = await context.onUpdateItem(
							editingItem,
							toItemInput(draft),
						);

						if (updated) {
							setEditingBranch(null);
						}

						return updated !== null;
					}}
				/>
			) : null}

			<ConfirmDialog
				open={removingBranch !== null}
				title="条件つきのメモを削除"
				cancelLabel="やめる"
				confirmLabel="削除する"
				danger
				pending={isRemoving}
				onCancel={() => setRemovingBranch(null)}
				onConfirm={async () => {
					if (!removingBranch) {
						return;
					}

					setIsRemoving(true);

					try {
						await context.onRemoveBranch(removingBranch);
					} finally {
						setIsRemoving(false);
						setRemovingBranch(null);
					}
				}}
			>
				中のメモもすべて消えます。
			</ConfirmDialog>
		</>
	);
}

// 編集した内容を、条件の材料の更新の入力にする（数量が読めなければ NaN にして、検証で止める）。
function toItemInput(draft: BranchConditionValue): UpdateShoppingItemInput {
	return {
		name: draft.name,
		quantity: parseQuantityInput(draft.quantity) ?? Number.NaN,
		unitLabel: draft.unitLabel,
		inventoryConversion: draft.presetConversion ?? undefined,
		categoryId: draft.categoryId || null,
		categoryAssignment: draft.categoryId
			? draft.isCategoryManual
				? "manual"
				: "automatic"
			: null,
		storeId: draft.storeId,
	};
}
