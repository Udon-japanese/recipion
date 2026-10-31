import { useEffect, useRef, useState } from "react";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Icon } from "#/components/icon/icon";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import type { CreateShoppingItemInput } from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-add-sheet.css";
import {
	type ShoppingItemDraft,
	ShoppingItemSheetFields,
} from "./shopping-item-sheet-fields";

type ShoppingAddSheetProps = {
	title: string;
	// 追加する。成功したら true（入力を空に戻して、続けて入れられる）。失敗したときのエラーは、errorMessage で表示する。
	onAdd: (input: CreateShoppingItemInput) => Promise<boolean>;
	errorMessage?: string | null;
	stores: readonly ShoppingStore[];
	// 食材名に対して、いつも買う店（なければ null）。
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	onClose: () => void;
};

const emptyDraft: ShoppingItemDraft = {
	name: "",
	quantity: "1",
	unitLabel: "",
	inventoryConversion: null,
	categoryId: "",
	isCategoryManual: false,
	storeId: null,
};

// 買い物メモへ、1つずつ（続けて）入れる。画面の上のカード＋下の角のボタン。
// 追加しても閉じず、入力は空に戻る。店は、前回のまま続ける（店ごとに回って買うときに楽）。
export function ShoppingAddSheet({
	title,
	onAdd,
	errorMessage = null,
	stores,
	defaultStoreIdFor,
	onCreateStore,
	onClose,
}: ShoppingAddSheetProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const [draft, setDraft] = useState<ShoppingItemDraft>(emptyDraft);
	// 店を自分で選んだら、名前の入力で「いつも買う店」を入れ直さない。
	const [isStoreChosen, setIsStoreChosen] = useState(false);
	// 前回の店（名前に「いつも買う店」がないときに、続ける）。
	const [carriedStoreId, setCarriedStoreId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isNameMissing, setIsNameMissing] = useState(false);
	// 入れたもの（このシートを開いてから）。
	const [added, setAdded] = useState<string[]>([]);

	function focusNameField() {
		formRef.current
			?.querySelector<HTMLInputElement>('input[role="combobox"]')
			?.focus();
	}

	// 開いたとき・追加したあと（欄を作り直す）は、すぐ名前を打てるようにする。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 追加した数が変わるたびに、名前の欄へ戻る。
	useEffect(() => {
		focusNameField();
	}, [added.length]);

	async function handleSubmit() {
		if (draft.name.trim() === "") {
			setIsNameMissing(true);
			focusNameField();

			return;
		}

		setIsSubmitting(true);

		try {
			const parsedQuantity = parseQuantityInput(draft.quantity);
			const isAdded = await onAdd({
				name: draft.name,
				quantity: parsedQuantity ?? Number.NaN,
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

			if (isAdded) {
				setAdded((current) => [
					...current,
					`${draft.name.trim()} ${formatQuantityForUnit(parsedQuantity ?? 1, draft.unitLabel || null)}${draft.unitLabel}`,
				]);
				setCarriedStoreId(draft.storeId);
				// 続けて入れられるように、空に戻す（店は、前回のまま）。名前の欄へは、上の effect で戻る。
				setDraft({ ...emptyDraft, storeId: draft.storeId });
				setIsStoreChosen(false);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<CornerSheet
			open
			title={title}
			// 入力欄があるので、ボタンは、キーボードの下に隠れない、カードの中に置く。
			actions="inline"
			// 打ちかけの入力を、うっかり消さないよう、空のときだけ、Esc と暗幕で閉じる。
			onDismiss={draft.name === "" && !isSubmitting ? onClose : undefined}
			// 1つも入れていないなら、「完了」ではなく「閉じる」。
			left={{
				label: added.length > 0 ? "完了" : "閉じる",
				icon: added.length > 0 ? "check" : "close",
				onClick: onClose,
				disabled: isSubmitting,
			}}
			right={{
				label: "追加",
				icon: "plus",
				pending: isSubmitting,
				onClick: () => void handleSubmit(),
			}}
		>
			<form
				className={styles.form}
				ref={formRef}
				onSubmit={(event) => {
					event.preventDefault();
					void handleSubmit();
				}}
			>
				{/* Enter で追加できるように、見えない送信ボタンを置く。 */}
				<button type="submit" hidden />

				<ShoppingItemSheetFields
					// 追加したら、欄の開閉（カテゴリを選ぶ欄など）も、はじめの形に戻す。
					key={added.length}
					value={draft}
					onChange={setDraft}
					nameLabel="買うもの"
					hideNameLabel
					namePlaceholder="卵、牛乳など"
					stores={stores}
					onCreateStore={onCreateStore}
					onNameChange={(next) => {
						setIsNameMissing(false);

						// 店を自分で選んでいなければ、「いつも買う店」（なければ、前回の店）を入れる。
						return isStoreChosen
							? next
							: {
									...next,
									storeId: defaultStoreIdFor(next.name) ?? carriedStoreId,
								};
					}}
					onStoreChange={(storeId) => {
						setIsStoreChosen(true);
						setCarriedStoreId(storeId);
					}}
				/>

				{added.length > 0 ? (
					<output className={styles.added}>
						<span className={styles.addedLabel}>入れたもの　</span>
						{added.join("、")}
					</output>
				) : null}

				{isNameMissing ? (
					<p className={styles.error} role="alert">
						<Icon name="alert-triangle" size={20} />
						買うものを入力してください
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
