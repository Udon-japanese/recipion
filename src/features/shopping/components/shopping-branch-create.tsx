import { useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Field, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import {
	type CreateShoppingBranchInput,
	defaultShoppingBranchCondition,
	maxShoppingBranchConditionLength,
	maxShoppingBranchLabelLength,
} from "../domain/shopping-branch";
import type { CreateShoppingItemInput } from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import { ShoppingItemForm } from "./shopping-item-form";
import * as styles from "./shopping-page.css";

type ShoppingBranchCreateProps = {
	stores: readonly ShoppingStore[];
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onAddBranch: (
		input: CreateShoppingBranchInput,
		conditionItemInput: CreateShoppingItemInput,
	) => Promise<boolean>;
};

// 「条件つきのメモを追加」のボタンと、作るシート。
export function ShoppingBranchCreate({
	stores,
	defaultStoreIdFor,
	onCreateStore,
	onAddBranch,
}: ShoppingBranchCreateProps) {
	const formId = useId();
	const isRight = useMediaQuery("(min-width: 1024px)");
	const [isOpen, setIsOpen] = useState(false);
	const [condition, setCondition] = useState(defaultShoppingBranchCondition);
	const [thenLabel, setThenLabel] = useState("");
	const [elseLabel, setElseLabel] = useState("");

	return (
		<>
			<Button
				variant="secondary"
				align="start"
				leadingIcon={<Icon name="plus" size={20} />}
				onClick={() => setIsOpen(true)}
			>
				条件つきのメモを追加
			</Button>

			<Sheet
				open={isOpen}
				onOpenChange={setIsOpen}
				title="条件つきのメモを追加"
				placement={isRight ? "right" : "bottom"}
				footer={
					<div className={styles.sheetFooter}>
						<Button
							variant="secondary"
							size="lg"
							fullWidth
							onClick={() => setIsOpen(false)}
						>
							やめる
						</Button>

						<Button size="lg" fullWidth type="submit" form={formId}>
							条件つきのメモを作る
						</Button>
					</div>
				}
			>
				<div className={styles.sheetFields}>
					<p className={styles.sheetIntro}>
						条件になる材料を入れて、どんな時かを書きます。
					</p>

					<ShoppingItemForm
						alwaysExpanded
						hideSubmitButton
						formId={formId}
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
								setIsOpen(false);
							}

							return added;
						}}
					>
						<Field label="どんな時に（材料が…）">
							{(control) => (
								<TextInput
									{...control}
									value={condition}
									maxLength={maxShoppingBranchConditionLength}
									onChange={(event) => setCondition(event.target.value)}
									placeholder="売っていたら"
									autoComplete="off"
								/>
							)}
						</Field>

						<Field label="そうなら（呼び名・省略可）">
							{(control) => (
								<TextInput
									{...control}
									value={thenLabel}
									maxLength={maxShoppingBranchLabelLength}
									onChange={(event) => setThenLabel(event.target.value)}
									placeholder="例：生姜焼き"
									autoComplete="off"
								/>
							)}
						</Field>

						<Field label="そうでなければ（呼び名・省略可）">
							{(control) => (
								<TextInput
									{...control}
									value={elseLabel}
									maxLength={maxShoppingBranchLabelLength}
									onChange={(event) => setElseLabel(event.target.value)}
									placeholder="例：ハンバーグ"
									autoComplete="off"
								/>
							)}
						</Field>
					</ShoppingItemForm>
				</div>
			</Sheet>
		</>
	);
}
