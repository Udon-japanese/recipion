import { type KeyboardEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { SelectBox, TextInput } from "#/components/field/field";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-page.css";

const newStoreValue = "__new-store__";

type ShoppingStoreSelectProps = {
	id: string;
	stores: readonly ShoppingStore[];
	value: string | null;
	onChange: (storeId: string | null) => void;
	// 新しい店を足す。成功したら、その店。
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

// 買う店の選択（その場で、新しい店も足せる）。
export function ShoppingStoreSelect({
	id,
	stores,
	value,
	onChange,
	onCreateStore,
}: ShoppingStoreSelectProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	// 店の追加の状態。追加できたら欄が閉じるので、見せるのは処理中と失敗だけ。
	const createAction = useButtonAction();

	async function handleCreate() {
		if (newName.trim() === "") {
			return;
		}

		await createAction.run(async () => {
			const store = await onCreateStore(newName);

			if (!store) {
				return false;
			}

			onChange(store.id);
			setIsCreating(false);
			setNewName("");
		});
	}

	// 入力欄の Enter で、外側の追加・編集のフォームが送信されないようにする。
	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			event.preventDefault();
			void handleCreate();
		}
	}

	return (
		<div>
			<SelectBox
				id={id}
				value={value ?? ""}
				onChange={(event) => {
					if (event.target.value === newStoreValue) {
						setIsCreating(true);

						return;
					}

					setIsCreating(false);
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				<option value="">どこでも</option>

				{stores.map((store) => (
					<option value={store.id} key={store.id}>
						{store.name}
					</option>
				))}

				<option value={newStoreValue}>＋ 新しい店を追加…</option>
			</SelectBox>

			{isCreating ? (
				<div className={styles.inlineStore}>
					<TextInput
						aria-label="新しい店の名前"
						value={newName}
						onChange={(event) => setNewName(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="店の名前"
						autoComplete="off"
					/>

					<div className={styles.inlineStoreButtons}>
						<Button
							size="sm"
							status={createAction.status}
							pendingLabel="店を追加しています"
							disabled={newName.trim() === ""}
							onClick={() => void handleCreate()}
						>
							この店を追加
						</Button>

						<Button
							size="sm"
							variant="secondary"
							onClick={() => {
								setIsCreating(false);
								setNewName("");
							}}
						>
							やめる
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
