import { useEffect, useState } from "react";
import type { ShoppingBranchRepository } from "../application/shopping-branch-repository";
import { getShoppingErrorMessage } from "../components/shopping-error-message";
import {
	type CreateShoppingBranchInput,
	createShoppingBranch,
	decideShoppingBranch,
	maxShoppingBranchCount,
	type ShoppingBranch,
	type ShoppingBranchSide,
	suggestShoppingBranchSideLabel,
	updateShoppingBranch,
} from "../domain/shopping-branch";
import {
	type CreateShoppingItemInput,
	createShoppingItem,
	type ShoppingItem,
} from "../domain/shopping-item";
import { upsertById } from "../domain/upsert-by-id";

type UseShoppingBranchesOptions = {
	repository: ShoppingBranchRepository;
	// 分岐の中の項目も含む、すべての項目。
	allItems: readonly ShoppingItem[];
	setItems: (update: (current: ShoppingItem[]) => ShoppingItem[]) => void;
	onError: (message: string | null) => void;
};

// 分岐型のメモ：作成・削除と、条件が決まったときの確定。
export function useShoppingBranches({
	repository,
	allItems,
	setItems,
	onError,
}: UseShoppingBranchesOptions) {
	const [branches, setBranches] = useState<ShoppingBranch[]>([]);

	useEffect(() => {
		let isActive = true;

		function handleError() {
			if (isActive) {
				onError("条件つきのメモを読み込めませんでした");
			}
		}

		// 購読できる保存先なら、別のタブからの変更も受け取る。
		if (repository.watch) {
			const unsubscribe = repository.watch((loaded) => {
				if (isActive) {
					setBranches(loaded);
				}
			}, handleError);

			return () => {
				isActive = false;
				unsubscribe();
			};
		}

		repository.list().then((loaded) => {
			if (isActive) {
				setBranches(loaded);
			}
		}, handleError);

		return () => {
			isActive = false;
		};
	}, [repository, onError]);

	// 条件の材料（通常のメモと同じ入力）と、どんな時か、で分岐を作る。
	async function addBranch(
		input: CreateShoppingBranchInput,
		conditionItemInput: CreateShoppingItemInput,
	): Promise<boolean> {
		onError(null);

		try {
			if (branches.length >= maxShoppingBranchCount) {
				onError(`条件つきのメモは${maxShoppingBranchCount}件までです`);

				return false;
			}

			const nextSortOrder =
				branches.reduce(
					(highest, branch) => Math.max(highest, branch.sortOrder),
					-1,
				) + 1;
			const branch = createShoppingBranch(input, nextSortOrder);

			const nextItemSortOrder =
				allItems.reduce(
					(highest, item) => Math.max(highest, item.sortOrder),
					-1,
				) + 1;
			const conditionItem = createShoppingItem(
				{
					...conditionItemInput,
					branchId: branch.id,
					branchSide: "condition",
				},
				new Date(),
				nextItemSortOrder,
			);

			await repository.create(branch, conditionItem);
			setBranches((current) => upsertById(current, branch));
			setItems((current) => upsertById(current, conditionItem));

			return true;
		} catch (error) {
			onError(getShoppingErrorMessage(error));

			return false;
		}
	}

	// 条件（どんな時に）と、側の呼び名を直す。
	async function updateBranch(
		branch: ShoppingBranch,
		input: CreateShoppingBranchInput,
	): Promise<boolean> {
		onError(null);

		try {
			const updated = updateShoppingBranch(branch, input);

			await repository.update(updated);
			setBranches((current) => upsertById(current, updated));

			return true;
		} catch (error) {
			onError(getShoppingErrorMessage(error));

			return false;
		}
	}

	async function removeBranch(branch: ShoppingBranch): Promise<boolean> {
		onError(null);

		try {
			await repository.remove(branch.id);
			setBranches((current) =>
				current.filter((entry) => entry.id !== branch.id),
			);
			setItems((current) =>
				current.filter((item) => item.branchId !== branch.id),
			);

			return true;
		} catch (error) {
			onError(getShoppingErrorMessage(error));

			return false;
		}
	}

	// 条件が決まった：選んだ側を通常の項目にして一覧の最後に加え、選ばなかった側と分岐を消す。
	async function decideBranch(
		branch: ShoppingBranch,
		side: ShoppingBranchSide,
	): Promise<boolean> {
		onError(null);

		try {
			const startSortOrder =
				allItems
					.filter((item) => !item.branchId)
					.reduce((highest, item) => Math.max(highest, item.sortOrder), -1) + 1;
			const { released, discardedIds } = decideShoppingBranch(
				allItems,
				branch.id,
				side,
				startSortOrder,
			);

			await repository.applyDecision(branch.id, released, discardedIds);

			const releasedById = new Map(released.map((item) => [item.id, item]));
			const discarded = new Set(discardedIds);

			setBranches((current) =>
				current.filter((entry) => entry.id !== branch.id),
			);
			setItems((current) =>
				current
					.filter((item) => !discarded.has(item.id))
					.map((item) => releasedById.get(item.id) ?? item),
			);

			return true;
		} catch (error) {
			onError(getShoppingErrorMessage(error));

			return false;
		}
	}

	// 側の呼び名が空なら、レシピの名前などを呼び名にする（すでにあれば、変えない）。
	async function labelSideIfEmpty(
		branchId: string,
		side: ShoppingBranchSide,
		name: string,
	): Promise<void> {
		const branch = branches.find((entry) => entry.id === branchId);
		const label = branch
			? suggestShoppingBranchSideLabel(branch, side, name)
			: null;

		if (!branch || label === null) {
			return;
		}

		try {
			await repository.setSideLabel(branchId, side, label);
			setBranches((current) =>
				current.map((entry) =>
					entry.id === branchId
						? {
								...entry,
								...(side === "then"
									? { thenLabel: label }
									: { elseLabel: label }),
							}
						: entry,
				),
			);
		} catch {
			// 呼び名は、あれば便利という程度なので、保存できなくても、メモへの追加は成功のままにする。
		}
	}

	return {
		branches,
		addBranch,
		updateBranch,
		removeBranch,
		decideBranch,
		labelSideIfEmpty,
	};
}
