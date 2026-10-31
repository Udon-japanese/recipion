import { useState } from "react";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Icon } from "#/components/icon/icon";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import { describeAmountDraftError } from "../domain/amount-draft";
import type {
	ShoppingItem,
	UpdateShoppingItemInput,
} from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-add-sheet.css";
import {
	type ConversionEdit,
	resolveEditedConversion,
	ShoppingConversionField,
} from "./shopping-conversion-field";
import {
	type ShoppingItemDraft,
	ShoppingItemSheetFields,
} from "./shopping-item-sheet-fields";

type ShoppingItemEditSheetProps = {
	item: ShoppingItem;
	// 保存する。成功したら true（呼び出し側が、シートを閉じる）。失敗したときのエラーは、errorMessage で表示する。
	// isConversionEdited：換算を自分で直した（呼び出し側が、換算の記憶を更新する）。
	onSave: (
		item: ShoppingItem,
		input: UpdateShoppingItemInput,
		options: { isConversionEdited: boolean },
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

// 入力中の内容で見た項目（換算の入力は、いまの名前・単位・数量に対して聞く）。
function previewItem(
	item: ShoppingItem,
	draft: ShoppingItemDraft,
): ShoppingItem {
	return {
		...item,
		name: draft.name.trim() || item.name,
		quantity: parseQuantityInput(draft.quantity) ?? item.quantity,
		unitLabel: draft.unitLabel.trim() || null,
		inventoryConversion: draft.inventoryConversion,
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
	// 換算の入力（「変える」を押すまでは null）。
	const [conversionEdit, setConversionEdit] = useState<ConversionEdit | null>(
		null,
	);
	const [conversionError, setConversionError] = useState<string>();
	const [isSaving, setIsSaving] = useState(false);
	const [isNameMissing, setIsNameMissing] = useState(false);
	// 換算を自分で決めた（換算の入力を直した、または「よく使う数量」のチップで選んだ）。
	const isConversionEdited =
		conversionEdit?.isEdited === true ||
		(draft.inventoryConversion !== null &&
			draft.inventoryConversion !== initialDraft.inventoryConversion);
	const isChanged = !isSameDraft(draft, initialDraft) || isConversionEdited;
	const preview = previewItem(item, draft);
	// 日用品は、在庫に入れないので、換算を聞かない。
	const isTracked = draft.categoryId !== "household";

	async function handleSave() {
		if (draft.name.trim() === "") {
			setIsNameMissing(true);

			return;
		}

		let inventoryConversion = draft.inventoryConversion;

		if (isTracked) {
			try {
				inventoryConversion =
					resolveEditedConversion(preview, conversionEdit) ??
					inventoryConversion;
			} catch (error) {
				// 閉じていても、直した入力が読めないときは、開いて、理由を見せる。
				setConversionError(describeAmountDraftError(error));
				setConversionEdit((current) =>
					current ? { ...current, isOpen: true } : current,
				);

				return;
			}
		}

		setIsSaving(true);

		try {
			await onSave(
				item,
				{
					name: draft.name,
					quantity: parseQuantityInput(draft.quantity) ?? Number.NaN,
					unitLabel: draft.unitLabel,
					inventoryConversion,
					categoryId: draft.categoryId || null,
					categoryAssignment: draft.categoryId
						? draft.isCategoryManual
							? "manual"
							: "automatic"
						: null,
					storeId: draft.storeId,
				},
				{ isConversionEdited: isTracked && isConversionEdited },
			);
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
						// 「よく使う数量」のチップで換算を選んだら、直しかけの換算の入力より、そちらを使う。
						if (
							next.inventoryConversion !== null &&
							next.inventoryConversion !== draft.inventoryConversion
						) {
							setConversionEdit(null);
							setConversionError(undefined);
						}

						setDraft(next);
						setIsNameMissing(false);
					}}
					nameLabel="商品名"
					stores={stores}
					onCreateStore={onCreateStore}
				/>

				{isTracked ? (
					<ShoppingConversionField
						item={preview}
						edit={conversionEdit}
						onEditChange={(next) => {
							setConversionEdit(next);
							setConversionError(undefined);
						}}
						error={conversionError}
						disabled={isSaving}
					/>
				) : null}

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
