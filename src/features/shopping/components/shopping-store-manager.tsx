import { useState } from "react";
import { Button } from "#/components/button/button";
import { TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-store-manager.css";

type ShoppingStoreManagerProps = {
	stores: readonly ShoppingStore[];
	// 店を足す。成功したら、その店。
	onAdd: (name: string) => Promise<ShoppingStore | null>;
	onRename: (store: ShoppingStore, name: string) => Promise<boolean>;
	onRemove: (store: ShoppingStore) => Promise<boolean>;
};

// 店の追加・名前の変更・削除（削除した店の項目は「どこでも」に戻る）。
export function ShoppingStoreManager({
	stores,
	onAdd,
	onRename,
	onRemove,
}: ShoppingStoreManagerProps) {
	const [newName, setNewName] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
		null,
	);

	async function addStore() {
		if (newName.trim() === "") {
			return;
		}

		if (await onAdd(newName)) {
			setNewName("");
		}
	}

	return (
		// 店が1つもないときは、追加の入力が見えるよう、開いておく。
		<details className={styles.manager} open={stores.length === 0 || undefined}>
			<summary className={styles.summary}>
				<Icon name="store" size={20} />
				店の管理
				<span className={styles.chevron}>
					<Icon name="chevron-down" size={20} />
				</span>
			</summary>

			<ul className={styles.list}>
				{stores.map((store) => (
					<li className={styles.row} key={store.id}>
						{editingId === store.id ? (
							<>
								<div className={styles.grow}>
									<TextInput
										aria-label={`${store.name}の新しい名前`}
										value={editName}
										onChange={(event) => setEditName(event.target.value)}
										autoComplete="off"
									/>
								</div>

								<div className={styles.buttons}>
									<Button
										size="sm"
										onClick={async () => {
											if (await onRename(store, editName)) {
												setEditingId(null);
											}
										}}
									>
										保存
									</Button>

									<Button
										size="sm"
										variant="secondary"
										onClick={() => setEditingId(null)}
									>
										やめる
									</Button>
								</div>
							</>
						) : confirmingRemoveId === store.id ? (
							<>
								<span className={styles.confirm}>
									{store.name}：この店の項目は「どこでも」になります。
								</span>

								<div className={styles.buttons}>
									<Button
										size="sm"
										variant="danger"
										onClick={async () => {
											await onRemove(store);
											setConfirmingRemoveId(null);
										}}
									>
										削除する
									</Button>

									<Button
										size="sm"
										variant="secondary"
										onClick={() => setConfirmingRemoveId(null)}
									>
										やめる
									</Button>
								</div>
							</>
						) : (
							<>
								<span className={styles.name}>{store.name}</span>

								<IconButton
									icon="edit"
									label={`${store.name}の名前を変更`}
									tone="plain"
									onClick={() => {
										setEditingId(store.id);
										setEditName(store.name);
										setConfirmingRemoveId(null);
									}}
								/>

								<IconButton
									icon="trash"
									label={`${store.name}を削除`}
									tone="plain"
									onClick={() => setConfirmingRemoveId(store.id)}
								/>
							</>
						)}
					</li>
				))}
			</ul>

			<div className={styles.addRow}>
				<div className={styles.grow}>
					<TextInput
						aria-label="新しい店の名前"
						placeholder="店を追加（例：イオン）"
						value={newName}
						onChange={(event) => setNewName(event.target.value)}
						onKeyDown={(event) => {
							// 変換確定の Enter は、IME に任せる。
							if (event.key === "Enter" && !event.nativeEvent.isComposing) {
								event.preventDefault();
								void addStore();
							}
						}}
						autoComplete="off"
					/>
				</div>

				<Button
					size="sm"
					aria-label="店を追加"
					leadingIcon={<Icon name="plus" size={20} />}
					disabled={newName.trim() === ""}
					onClick={() => void addStore()}
				>
					追加
				</Button>
			</div>
		</details>
	);
}
