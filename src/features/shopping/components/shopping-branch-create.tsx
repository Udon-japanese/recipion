import type { CreateShoppingBranchInput } from "../domain/shopping-branch";
import type { CreateShoppingItemInput } from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import {
	emptyBranchConditionValue,
	ShoppingBranchConditionEditor,
	toConditionItemInput,
} from "./shopping-branch-condition-editor";

type ShoppingBranchCreateProps = {
	stores: readonly ShoppingStore[];
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onAddBranch: (
		input: CreateShoppingBranchInput,
		conditionItemInput: CreateShoppingItemInput,
	) => Promise<boolean>;
	onClose: () => void;
};

// 条件つきのメモを作るフォーム（条件を直すときと同じ、文章の形）。開くのは、呼ぶ側（メニュー）。
export function ShoppingBranchCreate({
	stores,
	onCreateStore,
	onAddBranch,
	onClose,
}: ShoppingBranchCreateProps) {
	return (
		<ShoppingBranchConditionEditor
			mode="create"
			value={emptyBranchConditionValue}
			stores={stores}
			onCreateStore={onCreateStore}
			onCancel={() => onClose()}
			onSave={async (draft) => {
				const added = await onAddBranch(
					{
						condition: draft.condition,
						thenLabel: draft.thenLabel,
						elseLabel: draft.elseLabel,
					},
					toConditionItemInput(draft),
				);

				if (added) {
					onClose();
				}

				return added;
			}}
		/>
	);
}
