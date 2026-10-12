import { useState } from "react";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-list.css";

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
		<details className={styles.storeManager}>
			<summary>店の管理</summary>

			<ul className={styles.storeManagerList}>
				{stores.map((store) => (
					<li className={styles.storeManagerRow} key={store.id}>
						{editingId === store.id ? (
							<>
								<input
									className={styles.input}
									aria-label={`${store.name}の新しい名前`}
									value={editName}
									onChange={(event) => setEditName(event.target.value)}
									autoComplete="off"
								/>

								<button
									className={styles.sortButton}
									type="button"
									onClick={async () => {
										if (await onRename(store, editName)) {
											setEditingId(null);
										}
									}}
								>
									保存
								</button>

								<button
									className={styles.sortButton}
									type="button"
									onClick={() => setEditingId(null)}
								>
									やめる
								</button>
							</>
						) : (
							<>
								<span>{store.name}</span>

								<button
									className={styles.sortButton}
									type="button"
									aria-label={`${store.name}の名前を変更`}
									onClick={() => {
										setEditingId(store.id);
										setEditName(store.name);
										setConfirmingRemoveId(null);
									}}
								>
									名前を変更
								</button>

								{confirmingRemoveId === store.id ? (
									<>
										<span>この店の項目は「どこでも」になります。</span>

										<button
											className={styles.deleteButton}
											type="button"
											onClick={async () => {
												await onRemove(store);
												setConfirmingRemoveId(null);
											}}
										>
											削除する
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
										aria-label={`${store.name}を削除`}
										onClick={() => setConfirmingRemoveId(store.id)}
									>
										削除
									</button>
								)}
							</>
						)}
					</li>
				))}
			</ul>
		</details>
	);
}
