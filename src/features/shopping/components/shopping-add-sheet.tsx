import { useEffect, useMemo, useRef, useState } from "react";
import { useButtonAction } from "#/components/button/use-button-action";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Icon } from "#/components/icon/icon";
import {
	formatQuantity,
	formatQuantityForUnit,
} from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import type { ShoppingConversionDefaults } from "../domain/shopping-conversion-default";
import type { CreateShoppingItemInput } from "../domain/shopping-item";
import {
	findShoppingItemMemory,
	listRememberedShoppingChoices,
	type ShoppingItemMemories,
} from "../domain/shopping-item-memory";
import { inferShoppingCategory } from "../domain/shopping-item-suggestion";
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
	// 覚えた買い方（名前を入れたら、数量・単位・換算・カテゴリを埋める）。
	itemMemories?: ShoppingItemMemories;
	conversionDefaults?: ShoppingConversionDefaults;
};

const noItemMemories: ShoppingItemMemories = {};
const noConversionDefaults: ShoppingConversionDefaults = {};

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
	itemMemories = noItemMemories,
	conversionDefaults = noConversionDefaults,
}: ShoppingAddSheetProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const [draft, setDraft] = useState<ShoppingItemDraft>(emptyDraft);
	// 店を自分で選んだら、名前の入力で「いつも買う店」を入れ直さない。
	const [isStoreChosen, setIsStoreChosen] = useState(false);
	// 数量・単位・カテゴリを自分で決めたら、名前の入力で、覚えた買い方を入れ直さない。
	const [isAmountChosen, setIsAmountChosen] = useState(false);
	const [isCategoryChosen, setIsCategoryChosen] = useState(false);
	// 前回の店（名前に「いつも買う店」がないときに、続ける）。
	const [carriedStoreId, setCarriedStoreId] = useState<string | null>(null);
	// 「追加」の状態（処理中・追加しました・失敗）。追加しても閉じないので、完了も見せる。
	const submitAction = useButtonAction();
	const isSubmitting = submitAction.isPending;
	const [isNameMissing, setIsNameMissing] = useState(false);
	// 入れたもの（このシートを開いてから）。
	const [added, setAdded] = useState<string[]>([]);
	const rememberedChoices = useMemo(
		() =>
			listRememberedShoppingChoices(
				draft.name,
				itemMemories,
				conversionDefaults,
			),
		[draft.name, itemMemories, conversionDefaults],
	);

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

	// 自分で決めていない欄を、覚えた買い方で埋める（覚えていなければ、初期の形とカタログの推定）。
	// 数量・単位・換算：いちばん新しい候補（前回の買い方 → その食材のほかの換算の記憶）。
	// カテゴリ：前回のカテゴリ → カタログからの推定。
	function fillFromMemory(next: ShoppingItemDraft): ShoppingItemDraft {
		const [latest] = listRememberedShoppingChoices(
			next.name,
			itemMemories,
			conversionDefaults,
		);
		const memory = findShoppingItemMemory(itemMemories, next.name);
		const inferredCategoryId = inferShoppingCategory(next.name);

		return {
			...next,
			...(isAmountChosen
				? {}
				: latest
					? {
							quantity: formatQuantity(latest.quantity, { grouping: false }),
							unitLabel: latest.unitLabel ?? "",
							inventoryConversion: latest.inventoryConversion,
						}
					: {
							quantity: emptyDraft.quantity,
							unitLabel: emptyDraft.unitLabel,
							inventoryConversion: null,
						}),
			...(isCategoryChosen
				? {}
				: memory
					? {
							categoryId: memory.categoryId ?? "",
							isCategoryManual: memory.categoryAssignment === "manual",
						}
					: { categoryId: inferredCategoryId ?? "", isCategoryManual: false }),
		};
	}

	async function handleSubmit() {
		if (draft.name.trim() === "") {
			setIsNameMissing(true);
			focusNameField();

			return;
		}

		await submitAction.run(async () => {
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
				setIsAmountChosen(false);
				setIsCategoryChosen(false);
			}

			return isAdded;
		});
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
				status: submitAction.status,
				successLabel: "追加しました",
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
					rememberedChoices={rememberedChoices}
					onNameChange={(next) => {
						setIsNameMissing(false);

						// 店を自分で選んでいなければ、「いつも買う店」（なければ、前回の店）を入れる。
						const withStore = isStoreChosen
							? next
							: {
									...next,
									storeId: defaultStoreIdFor(next.name) ?? carriedStoreId,
								};

						return fillFromMemory(withStore);
					}}
					onAmountChange={() => setIsAmountChosen(true)}
					onCategoryChange={() => setIsCategoryChosen(true)}
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
