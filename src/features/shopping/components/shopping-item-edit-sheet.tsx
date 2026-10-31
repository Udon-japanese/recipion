import { useState } from "react";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Icon } from "#/components/icon/icon";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import type {
	ShoppingItem,
	UpdateShoppingItemInput,
} from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-add-sheet.css";
import {
	type ShoppingItemDraft,
	ShoppingItemSheetFields,
} from "./shopping-item-sheet-fields";

type ShoppingItemEditSheetProps = {
	item: ShoppingItem;
	// 保存する。成功したら true（呼び出し側が、シートを閉じる）。失敗したときのエラーは、errorMessage で表示する。
	onSave: (
		item: ShoppingItem,
		input: UpdateShoppingItemInput,
	) => Promise<boolean>;
	onClose: () => void;
	errorMessage?: string | null;
	stores: readonly ShoppingStore[];
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

function draftFromItem(item: ShoppingItem): ShoppingItemDraft {
	return {
		name: item.name,
		quantity: formatQuantity(item.quantity, { grouping: false }),
		unitLabel: item.unitLabel ?? "",
		inventoryConversion: item.inventoryConversion ?? null,
		categoryId: item.categoryId ?? "",
		isCategoryManual: item.categoryAssignment === "manual",
		storeId: item.storeId,
	};
}

function isSameDraft(a: ShoppingItemDraft, b: ShoppingItemDraft): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

// 買い物メモの 1 項目を直す。追加のシートと同じ欄（画面の上のカード＋下の角のボタン）。
// 名前を変えても、店は選んであるまま（「いつも買う店」で入れ直さない）。
export function ShoppingItemEditSheet({
	item,
	onSave,
	onClose,
	errorMessage = null,
	stores,
	onCreateStore,
}: ShoppingItemEditSheetProps) {
	const [initialDraft] = useState(() => draftFromItem(item));
	const [draft, setDraft] = useState(initialDraft);
	const [isSaving, setIsSaving] = useState(false);
	const [isNameMissing, setIsNameMissing] = useState(false);
	const isChanged = !isSameDraft(draft, initialDraft);

	async function handleSave() {
		if (draft.name.trim() === "") {
			setIsNameMissing(true);

			return;
		}

		setIsSaving(true);

		try {
			await onSave(item, {
				name: draft.name,
				quantity: parseQuantityInput(draft.quantity) ?? Number.NaN,
				unitLabel: draft.unitLabel,
				inventoryConversion: draft.inventoryConversion,
				categoryId: draft.categoryId || null,
				categoryAssignment: draft.categoryId
					? draft.isCategoryManual
						? "manual"
						: "automatic"
					: null,
				storeId: draft.storeId,
			});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<CornerSheet
			open
			title={`${item.name}を直す`}
			// 入力欄があるので、ボタンは、キーボードの下に隠れない、カードの中に置く。
			actions="inline"
			// 直しかけを、うっかり消さないよう、何も変えていないときだけ、Esc と暗幕で閉じる。
			onDismiss={!isChanged && !isSaving ? onClose : undefined}
			left={{
				label: "やめる",
				icon: "close",
				onClick: onClose,
				disabled: isSaving,
			}}
			right={{
				label: "保存",
				icon: "check",
				pending: isSaving,
				onClick: () => void handleSave(),
			}}
		>
			<form
				className={styles.form}
				aria-label={`${item.name}の編集`}
				onSubmit={(event) => {
					event.preventDefault();
					void handleSave();
				}}
			>
				{/* Enter で保存できるように、見えない送信ボタンを置く。 */}
				<button type="submit" hidden />

				<ShoppingItemSheetFields
					value={draft}
					onChange={(next) => {
						setDraft(next);
						setIsNameMissing(false);
					}}
					nameLabel="商品名"
					stores={stores}
					onCreateStore={onCreateStore}
				/>

				{isNameMissing ? (
					<p className={styles.error} role="alert">
						<Icon name="alert-triangle" size={20} />
						商品名を入力してください
					</p>
				) : null}

				{errorMessage ? (
					<p className={styles.error} role="alert">
						<Icon name="alert-triangle" size={20} />
						{errorMessage}
					</p>
				) : null}
			</form>
		</CornerSheet>
	);
}
