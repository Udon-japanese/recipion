import { type ReactNode, useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Field, TextInput } from "#/components/field/field";
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
import { ShoppingBulkAdd } from "./shopping-bulk-add";
import { ShoppingItemEditForm } from "./shopping-item-edit-form";
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

					<Button
						variant="secondary"
						size="sm"
						leadingIcon={<Icon name="rows" size={20} />}
						aria-label={`${title}にまとめて追加`}
						onClick={() => setBulkTarget({ branch, side })}
					>
						まとめて追加
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
								{describeCondition(
									conditionItem,
									conditionStore,
									branch.condition,
								)}
							</span>

							<IconButton
								icon="edit"
								label={`${conditionItem?.name ?? branch.condition}の条件を編集`}
								tone="plain"
								onClick={() => setEditingBranch(branch)}
							/>
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

			{bulkTarget ? (
				<ShoppingBulkAdd
					title={`${
						bulkTarget.side === "then"
							? sideTitle(bulkTarget.branch.thenLabel, "そうなら")
							: sideTitle(bulkTarget.branch.elseLabel, "そうでなければ")
					}にまとめて追加`}
					stores={context.stores}
					conversionDefaults={context.conversionDefaults}
					onClose={() => setBulkTarget(null)}
					onAdd={(lines) =>
						context.onAddItems(bulkTarget.branch, bulkTarget.side, lines)
					}
					onCreateStore={context.onCreateStore}
				/>
			) : null}

			{editingBranch ? (
				<BranchEditSheet
					branch={editingBranch}
					conditionItem={getShoppingBranchConditionItem(
						context.items,
						editingBranch.id,
					)}
					context={context}
					isRight={isRight}
					onClose={() => setEditingBranch(null)}
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

type BranchEditSheetProps = {
	branch: ShoppingBranch;
	conditionItem: ShoppingItem | undefined;
	context: ShoppingBranchCardsContext;
	isRight: boolean;
	onClose: () => void;
};

// 条件の編集：条件の材料（名前・数量・単位・カテゴリ・店）と、どんな時に、側の呼び名を、まとめて直す。
function BranchEditSheet({
	branch,
	conditionItem,
	context,
	isRight,
	onClose,
}: BranchEditSheetProps) {
	const [condition, setCondition] = useState(branch.condition);
	const [thenLabel, setThenLabel] = useState(branch.thenLabel ?? "");
	const [elseLabel, setElseLabel] = useState(branch.elseLabel ?? "");

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			title="条件を編集"
			placement={isRight ? "right" : "bottom"}
			snapPoints={isRight ? [0.92] : [0.7, 0.92]}
		>
			{conditionItem ? (
				<ShoppingItemEditForm
					item={conditionItem}
					stores={context.stores}
					onCreateStore={context.onCreateStore}
					onCancel={onClose}
					onSave={async (item, input) => {
						const isBranchSaved = await context.onUpdateBranch(branch, {
							condition,
							thenLabel,
							elseLabel,
						});

						if (!isBranchSaved) {
							return false;
						}

						const updated = await context.onUpdateItem(item, input);

						if (updated) {
							onClose();
						}

						return updated !== null;
					}}
				>
					<Field label="どんな時に" hint="例：売っていたら、安ければ">
						{(control) => (
							<TextInput
								{...control}
								value={condition}
								onChange={(event) => setCondition(event.target.value)}
								autoComplete="off"
							/>
						)}
					</Field>

					<Field label="「そうなら」の呼び名（省略できます）">
						{(control) => (
							<TextInput
								{...control}
								value={thenLabel}
								onChange={(event) => setThenLabel(event.target.value)}
								placeholder="例：ハンバーグ"
								autoComplete="off"
							/>
						)}
					</Field>

					<Field label="「そうでなければ」の呼び名（省略できます）">
						{(control) => (
							<TextInput
								{...control}
								value={elseLabel}
								onChange={(event) => setElseLabel(event.target.value)}
								placeholder="例：チキン南蛮"
								autoComplete="off"
							/>
						)}
					</Field>
				</ShoppingItemEditForm>
			) : null}
		</Sheet>
	);
}
