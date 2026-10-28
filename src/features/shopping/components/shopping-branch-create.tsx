import { useState } from "react";
import { Button } from "#/components/button/button";
import { Icon } from "#/components/icon/icon";
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
};

// 「条件つきのメモを追加」のボタンと、作るフォーム（条件を直すときと同じ、文章の形）。
export function ShoppingBranchCreate({
	stores,
	onCreateStore,
	onAddBranch,
}: ShoppingBranchCreateProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="secondary"
				size="sm"
				align="start"
				leadingIcon={<Icon name="plus" size={20} />}
				onClick={() => setIsOpen(true)}
			>
				条件つきのメモを追加
			</Button>

			{isOpen ? (
				<ShoppingBranchConditionEditor
					mode="create"
					value={emptyBranchConditionValue}
					stores={stores}
					onCreateStore={onCreateStore}
					onCancel={() => setIsOpen(false)}
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
							setIsOpen(false);
						}

						return added;
					}}
				/>
			) : null}
		</>
	);
}
