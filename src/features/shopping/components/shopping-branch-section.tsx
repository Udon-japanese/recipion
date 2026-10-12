import { useState } from "react";
import type { ShoppingRepository } from "../application/shopping-repository";
import {
	type CreateShoppingBranchInput,
	defaultShoppingBranchCondition,
	getShoppingBranchConditionItem,
	getShoppingBranchSideItems,
	maxShoppingBranchConditionLength,
	maxShoppingBranchLabelLength,
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
import * as styles from "./shopping-list.css";

type ShoppingBranchSectionProps = {
	branches: readonly ShoppingBranch[];
	// 分岐の中の項目も含む、すべての項目。
	items: readonly ShoppingItem[];
	stores: readonly ShoppingStore[];
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onAddBranch: (
		input: CreateShoppingBranchInput,
		conditionItemInput: CreateShoppingItemInput,
	) => Promise<boolean>;
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

function sideTitle(label: string | null, fallback: string): string {
	return label ? `${fallback}（${label}）` : fallback;
}

// 「条件つきのメモ」：条件が決まるまで、どちらを買うか決まらない 2 つのまとまり。
export function ShoppingBranchSection({
	branches,
	items,
	stores,
	defaultStoreIdFor,
	onCreateStore,
	onAddBranch,
	onRemoveBranch,
	onDecide,
	onAddItem,
	onRemoveItem,
	renderRecipePicker,
	onRecipeApplied,
	repository,
}: ShoppingBranchSectionProps) {
	// 「レシピから入れる」を開いている側（分岐の ID と側）。
	const [pickingKey, setPickingKey] = useState<string | null>(null);
	const [condition, setCondition] = useState(defaultShoppingBranchCondition);
	const [thenLabel, setThenLabel] = useState("");
	const [elseLabel, setElseLabel] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
		null,
	);
	const storeNamesById = new Map(stores.map((store) => [store.id, store.name]));

	return (
		<section className={styles.branchSection} aria-label="条件つきのメモ">
			{branches.map((branch) => {
				const conditionItem = getShoppingBranchConditionItem(items, branch.id);

				return (
					<div className={styles.branchCard} key={branch.id}>
						<h2 className={styles.branchCondition}>
							{conditionItem
								? `${conditionItem.name} ${conditionItem.quantity}${conditionItem.unitLabel ?? ""}`
								: ""}
							{conditionItem?.storeId &&
							storeNamesById.get(conditionItem.storeId) ? (
								<span className={styles.storeLabel}>
									{storeNamesById.get(conditionItem.storeId)}
								</span>
							) : null}
							<span>が{branch.condition}</span>
						</h2>

						<div className={styles.branchSides}>
							{(["then", "else"] as const).map((side) => {
								const sideItems = getShoppingBranchSideItems(
									items,
									branch.id,
									side,
								);
								const title =
									side === "then"
										? sideTitle(branch.thenLabel, "そうなら")
										: sideTitle(branch.elseLabel, "そうでなければ");

								return (
									<div className={styles.branchSide} key={side}>
										<h3 className={styles.branchSideTitle}>{title}</h3>

										{sideItems.length === 0 ? (
											<p className={styles.message}>まだありません。</p>
										) : (
											<ul className={styles.list}>
												{sideItems.map((item) => (
													<li className={styles.branchItemRow} key={item.id}>
														<span>
															{item.name} {item.quantity}
															{item.unitLabel}
															{item.storeId &&
															storeNamesById.get(item.storeId) ? (
																<span className={styles.storeLabel}>
																	{storeNamesById.get(item.storeId)}
																</span>
															) : null}
														</span>

														<button
															className={styles.deleteButton}
															type="button"
															aria-label={`${item.name}を削除（${title}）`}
															onClick={() => void onRemoveItem(item.id)}
														>
															削除
														</button>
													</li>
												))}
											</ul>
										)}

										{renderRecipePicker && repository ? (
											pickingKey === `${branch.id}:${side}` ? (
												renderRecipePicker({
													repository,
													destination: { branchId: branch.id, side },
													onClose: () => setPickingKey(null),
													onApplied: (recipeName) =>
														onRecipeApplied?.(branch, side, recipeName),
												})
											) : (
												<button
													className={styles.sortButton}
													type="button"
													onClick={() => setPickingKey(`${branch.id}:${side}`)}
												>
													{`${title}にレシピから入れる`}
												</button>
											)
										) : null}

										<details>
											<summary>{title}に追加</summary>

											<ShoppingItemForm
												idPrefix={`branch-${branch.id}-${side}`}
												submitLabel="この側に追加"
												errorMessage={null}
												stores={stores}
												defaultStoreIdFor={defaultStoreIdFor}
												onCreateStore={onCreateStore}
												onAdd={(input) => onAddItem(branch, side, input)}
											/>
										</details>
									</div>
								);
							})}
						</div>

						<div className={styles.branchActions}>
							<button
								className={styles.sortButton}
								type="button"
								onClick={() => void onDecide(branch, "then")}
							>
								そうだった
							</button>

							<button
								className={styles.sortButton}
								type="button"
								onClick={() => void onDecide(branch, "else")}
							>
								ちがった
							</button>

							{confirmingRemoveId === branch.id ? (
								<>
									<span>中のメモもすべて消えます。</span>

									<button
										className={styles.deleteButton}
										type="button"
										onClick={async () => {
											await onRemoveBranch(branch);
											setConfirmingRemoveId(null);
										}}
									>
										消す
									</button>

									<button
										className={styles.sortButton}
										type="button"
										onClick={() => setConfirmingRemoveId(null)}
									>
										やめる
									</button>
								</>
							) : (
								<button
									className={styles.deleteButton}
									type="button"
									aria-label={`${conditionItem?.name ?? branch.condition}の条件つきのメモを削除`}
									onClick={() => setConfirmingRemoveId(branch.id)}
								>
									条件つきのメモを削除
								</button>
							)}
						</div>
					</div>
				);
			})}

			{isCreating ? (
				<div className={styles.branchCard}>
					<p className={styles.branchSideTitle}>
						条件になる材料を入れて、どんな時かを書きます。
					</p>

					<ShoppingItemForm
						idPrefix="branch-new"
						submitLabel="条件つきのメモを作る"
						errorMessage={null}
						stores={stores}
						defaultStoreIdFor={defaultStoreIdFor}
						onCreateStore={onCreateStore}
						onAdd={async (input) => {
							const added = await onAddBranch(
								{ condition, thenLabel, elseLabel },
								input,
							);

							if (added) {
								setCondition(defaultShoppingBranchCondition);
								setThenLabel("");
								setElseLabel("");
								setIsCreating(false);
							}

							return added;
						}}
					>
						<div className={styles.field}>
							<label className={styles.fieldLabel} htmlFor="branch-condition">
								どんな時に（材料が…）
							</label>

							<input
								className={styles.input}
								id="branch-condition"
								value={condition}
								maxLength={maxShoppingBranchConditionLength}
								onChange={(event) => setCondition(event.target.value)}
								placeholder="売っていたら"
								autoComplete="off"
							/>
						</div>

						<div className={styles.details}>
							<div className={styles.field}>
								<label
									className={styles.fieldLabel}
									htmlFor="branch-then-label"
								>
									そうなら（呼び名・省略可）
								</label>

								<input
									className={styles.input}
									id="branch-then-label"
									value={thenLabel}
									maxLength={maxShoppingBranchLabelLength}
									onChange={(event) => setThenLabel(event.target.value)}
									placeholder="ハンバーグ"
									autoComplete="off"
								/>
							</div>

							<div className={styles.field}>
								<label
									className={styles.fieldLabel}
									htmlFor="branch-else-label"
								>
									そうでなければ（呼び名・省略可）
								</label>

								<input
									className={styles.input}
									id="branch-else-label"
									value={elseLabel}
									maxLength={maxShoppingBranchLabelLength}
									onChange={(event) => setElseLabel(event.target.value)}
									placeholder="チキン南蛮"
									autoComplete="off"
								/>
							</div>
						</div>
					</ShoppingItemForm>

					<button
						className={styles.sortButton}
						type="button"
						onClick={() => setIsCreating(false)}
					>
						やめる
					</button>
				</div>
			) : (
				<button
					className={styles.sortButton}
					type="button"
					onClick={() => setIsCreating(true)}
				>
					＋ 条件つきのメモを追加
				</button>
			)}
		</section>
	);
}
