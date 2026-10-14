import { useState } from "react";
import { Button } from "#/components/button/button";
import { TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-store-manager.css";

type ShoppingStoreManagerProps = {
	stores: readonly ShoppingStore[];
	onRename: (store: ShoppingStore, name: string) => Promise<boolean>;
	onRemove: (store: ShoppingStore) => Promise<boolean>;
};

// 店の名前の変更と削除（削除した店の項目は「どこでも」に戻る）。
export function ShoppingStoreManager({
	stores,
	onRename,
	onRemove,
}: ShoppingStoreManagerProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
		null,
	);

	if (stores.length === 0) {
		return null;
	}

	return (
		<details className={styles.manager}>
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
		</details>
	);
}
