import { type ReactNode, useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import {
	ListRow,
	ListRowMeta,
	ListRowName,
} from "#/components/list-row/list-row";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { useMediaQuery } from "#/components/use-media-query";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import type { ShoppingRepository } from "../application/shopping-repository";
import {
	getShoppingBranchConditionItem,
	getShoppingBranchSideItems,
	type ShoppingBranch,
	type ShoppingBranchSide,
} from "../domain/shopping-branch";
import type {
	CreateShoppingItemInput,
	ShoppingItem,
} from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import type { RenderRecipePicker } from "./recipe-picker-slot";
import { ShoppingItemForm } from "./shopping-item-form";
import * as styles from "./shopping-page.css";

// 条件つきのメモを扱う操作と、まわりの情報（一覧の画面から渡す）。
export type ShoppingBranchCardsContext = {
	// 分岐の中の項目も含む、すべての項目。
	items: readonly ShoppingItem[];
	stores: readonly ShoppingStore[];
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
	onRemoveItem: (itemId: string) => Promise<boolean>;
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

function describeItem(item: ShoppingItem): string {
	return `${item.name} ${formatQuantityForUnit(item.quantity, item.unitLabel)}${item.unitLabel ?? ""}`;
}

// 分類のカードの中に置く、条件つきのメモのブロック（条件・2 つの側・決める・削除）。
export function ShoppingBranchCards({
	branches,
	context,
}: ShoppingBranchCardsProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");
	// 「レシピから入れる」を開いている側（分岐の ID と側）。
	const [pickingKey, setPickingKey] = useState<string | null>(null);
	// 「追加」のシートを開いている側。
	const [addTarget, setAddTarget] = useState<{
		branch: ShoppingBranch;
		side: ShoppingBranchSide;
	} | null>(null);
	const [removingBranch, setRemovingBranch] = useState<ShoppingBranch | null>(
		null,
	);
	const [isRemoving, setIsRemoving] = useState(false);
	const storeNamesById = new Map(
		context.stores.map((store) => [store.id, store.name]),
	);

	function renderSide(branch: ShoppingBranch, side: ShoppingBranchSide) {
		const sideItems = getShoppingBranchSideItems(
			context.items,
			branch.id,
			side,
		);
		const title =
			side === "then"
				? sideTitle(branch.thenLabel, "そうなら")
				: sideTitle(branch.elseLabel, "そうでなければ");
		const key = `${branch.id}:${side}`;
		let picker: ReactNode = null;

		if (context.renderRecipePicker && context.repository) {
			picker = (
				<>
					<Button
						variant="secondary"
						size="sm"
						leadingIcon={<Icon name="book" size={20} />}
						aria-label={`${title}にレシピから入れる`}
						onClick={() => setPickingKey(key)}
					>
						レシピから入れる
					</Button>

					{pickingKey === key
						? context.renderRecipePicker({
								repository: context.repository,
								destination: { branchId: branch.id, side },
								onClose: () => setPickingKey(null),
								onApplied: (recipeName) =>
									context.onRecipeApplied?.(branch, side, recipeName),
							})
						: null}
				</>
			);
		}

		return (
			<div className={styles.branchSide} data-side={side} key={side}>
				<h3 className={styles.branchSideTitle}>
					<Tag icon={side === "then" ? "check-circle" : "ban-circle"}>
						{title}
					</Tag>
				</h3>

				{sideItems.length === 0 ? (
					<p className={styles.branchSideEmpty}>まだありません。</p>
				) : (
					<ul className={styles.branchSideRows}>
						{sideItems.map((item) => {
							const storeName = item.storeId
								? storeNamesById.get(item.storeId)
								: undefined;

							return (
								<ListRow
									key={item.id}
									actions={
										<IconButton
											icon="trash"
											label={`${item.name}を削除（${title}）`}
											tone="plain"
											onClick={() => void context.onRemoveItem(item.id)}
										/>
									}
								>
									<ListRowName>{item.name}</ListRowName>

									<ListRowMeta>
										<span>
											{formatQuantityForUnit(item.quantity, item.unitLabel)}
											{item.unitLabel}
										</span>

										{storeName ? <Tag icon="store">{storeName}</Tag> : null}
									</ListRowMeta>
								</ListRow>
							);
						})}
					</ul>
				)}

				<div className={styles.branchSideActions}>
					{picker}

					<Button
						variant="secondary"
						size="sm"
						leadingIcon={<Icon name="plus" size={20} />}
						aria-label={`${title}に追加`}
						onClick={() => setAddTarget({ branch, side })}
					>
						追加
					</Button>
				</div>
			</div>
		);
	}

	const addTitle = addTarget
		? `${
				addTarget.side === "then"
					? sideTitle(addTarget.branch.thenLabel, "そうなら")
					: sideTitle(addTarget.branch.elseLabel, "そうでなければ")
			}に追加`
		: "";
	const addFormId = "shopping-branch-side-form";

	return (
		<>
			{branches.map((branch) => {
				const conditionItem = getShoppingBranchConditionItem(
					context.items,
					branch.id,
				);
				const conditionStore = conditionItem?.storeId
					? storeNamesById.get(conditionItem.storeId)
					: undefined;

				return (
					<div className={styles.branchBlock} key={branch.id}>
						<h2 className={styles.branchCondition}>
							<span className={styles.branchConditionText}>
								{conditionItem
									? `${describeItem(conditionItem)} が${branch.condition}`
									: `${branch.condition}`}
							</span>

							{conditionStore ? <Tag icon="store">{conditionStore}</Tag> : null}
						</h2>

						{renderSide(branch, "then")}
						{renderSide(branch, "else")}

						<div className={styles.branchFooter}>
							<div className={styles.branchDecide}>
								<Button
									variant="secondary"
									leadingIcon={<Icon name="check" size={20} />}
									onClick={() => void context.onDecide(branch, "then")}
								>
									そうだった
								</Button>

								<Button
									variant="secondary"
									leadingIcon={<Icon name="close" size={20} />}
									onClick={() => void context.onDecide(branch, "else")}
								>
									ちがった
								</Button>
							</div>

							<Button
								variant="danger"
								leadingIcon={<Icon name="trash" size={20} />}
								aria-label={`${conditionItem?.name ?? branch.condition}の条件つきのメモを削除`}
								onClick={() => setRemovingBranch(branch)}
							>
								条件つきのメモを削除
							</Button>
						</div>
					</div>
				);
			})}

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
