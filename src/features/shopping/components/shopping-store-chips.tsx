import { type KeyboardEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip } from "#/components/chip/chip";
import { TextInput } from "#/components/field/field";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-add-sheet.css";

type ShoppingStoreChipsProps = {
	stores: readonly ShoppingStore[];
	value: string | null;
	onChange: (storeId: string | null) => void;
	// 新しい店を足す。成功したら、その店。
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

// 買う店を、押して選ぶ（その場で、新しい店も足せる）。
export function ShoppingStoreChips({
	stores,
	value,
	onChange,
	onCreateStore,
}: ShoppingStoreChipsProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	async function handleCreate() {
		if (newName.trim() === "") {
			return;
		}

		setIsSaving(true);

		try {
			const store = await onCreateStore(newName);

			if (store) {
				onChange(store.id);
				setIsCreating(false);
				setNewName("");
			}
		} finally {
			setIsSaving(false);
		}
	}

	// 入力欄の Enter で、外側の追加のフォームが送信されないようにする。
	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			event.preventDefault();
			void handleCreate();
		}
	}

	return (
		<fieldset className={styles.group}>
			<legend className={styles.groupLabel}>買う店</legend>

			<div className={styles.chips}>
				<Chip pressed={value === null} onClick={() => onChange(null)}>
					どこでも
				</Chip>

				{stores.map((store) => (
					<Chip
						pressed={value === store.id}
						key={store.id}
						onClick={() => onChange(store.id)}
					>
						{store.name}
					</Chip>
				))}

				<Chip icon="plus" onClick={() => setIsCreating(true)}>
					店を足す
				</Chip>
			</div>

			{isCreating ? (
				<div className={styles.newStore}>
					<TextInput
						aria-label="新しい店の名前"
						value={newName}
						onChange={(event) => setNewName(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="店の名前"
						autoComplete="off"
					/>

					<div className={styles.newStoreButtons}>
						<Button
							size="sm"
							disabled={isSaving || newName.trim() === ""}
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
		</fieldset>
	);
}
