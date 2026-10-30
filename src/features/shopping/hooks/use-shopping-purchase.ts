import { useMemo, useRef, useState } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { SyncInventoryPurchaseOutboxResult } from "#/features/inventory/application/sync-inventory-purchase-outbox";
import {
	type ExpiryFieldsValue,
	emptyExpiryFields,
	toLotInput,
} from "#/features/inventory/components/expiry-fields";
import { buildExpiryPrefill } from "#/features/inventory/domain/build-expiry-prefill";
import type { ExpiryEstimateLevel } from "#/features/inventory/domain/estimate-lot-expiry";
import {
	type InventoryLotInput,
	toDateString,
} from "#/features/inventory/domain/inventory-lot";
import { useExpiryEstimateLevel } from "#/features/inventory/hooks/use-expiry-estimate-level";
import { useIngredientExpiryDefaults } from "#/features/inventory/hooks/use-ingredient-expiry-defaults";
import {
	getLearnedRemainingDays,
	recordExpiryHint,
} from "#/features/inventory/infrastructure/expiry-hints-storage";
import type { ShoppingItemInventoryConfiguration } from "../components/shopping-item-inventory-conversion-form";
import {
	buildConversionConfiguration,
	type ConversionDraft,
	describeConversionDraftError,
	initialConversionDraft,
} from "../domain/conversion-draft";
import {
	isSameConversionDefault,
	type ShoppingConversionDefault,
} from "../domain/shopping-conversion-default";
import {
	isInventoryTrackedShoppingItem,
	type ShoppingItem,
	updateShoppingItem,
} from "../domain/shopping-item";
import type {
	ConfirmCheckedShoppingItemsPurchaseResult,
	ConfirmShoppingPurchasesOptions,
} from "../infrastructure/dexie-shopping-purchase";

export type SyncPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<SyncInventoryPurchaseOutboxResult>;

export type ConfirmPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
	options?: ConfirmShoppingPurchasesOptions,
) => Promise<ConfirmCheckedShoppingItemsPurchaseResult>;

type UseShoppingPurchaseOptions = {
	items: ShoppingItem[];
	ownerScope: InventoryPurchaseOwnerScope | null;
	confirmPurchases: ConfirmPurchases;
	syncPurchases?: SyncPurchases;
	setErrorMessage: (message: string | null) => void;
	// 購入が確定した項目（購入済みになったもの）を、画面の一覧へ反映する。
	applyPurchasedItems: (purchasedItems: ShoppingItem[]) => void;
	// 換算の設定を保存する（成功したら、更新後の項目）。
	saveConversion: (change: () => ShoppingItem) => Promise<ShoppingItem | null>;
	// 食材ごとの、在庫換算の記憶。設定した換算を覚え、次から数量のない行に使う。
	conversionMemory: {
		lookup: (
			itemName: string,
			unitLabel: string | null,
		) => ShoppingConversionDefault | undefined;
		remember: (
			itemName: string,
			value: ShoppingConversionDefault,
		) => Promise<void>;
	};
};

// 記憶と違う換算を設定したときの、確認（「変える」か「今回だけ」）。
export type ConversionOverwriteRequest = {
	itemName: string;
	previous: ShoppingConversionDefault;
	next: ShoppingConversionDefault;
};

// チェック済みの購入確定の流れ（期限の確認 → 確定 → 在庫換算の設定 → 在庫への反映）。
export function useShoppingPurchase({
	items,
	ownerScope,
	confirmPurchases,
	syncPurchases,
	setErrorMessage,
	applyPurchasedItems,
	saveConversion,
	conversionMemory,
}: UseShoppingPurchaseOptions) {
	const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
	const [conversionItemId, setConversionItemId] = useState<string | null>(null);
	const [isSavingConversion, setIsSavingConversion] = useState(false);
	// 記憶と違う換算を設定したとき、答えを待つあいだ（複数あるときは、1件ずつ聞く）。
	const [overwriteQueue, setOverwriteQueue] = useState<
		ConversionOverwriteRequest[]
	>([]);
	const overwriteRequest = overwriteQueue[0] ?? null;

	// 購入確定の確認画面で、換算が足りない商品の、入力途中の換算（商品の ID ごと）と、その誤り。
	const [conversionDrafts, setConversionDrafts] = useState<
		Record<string, ConversionDraft>
	>({});
	const [conversionErrors, setConversionErrors] = useState<
		Record<string, string>
	>({});

	// 購入確定の前に、期限・保存方法を確認する画面（任意入力）。
	const [isReviewingExpiry, setIsReviewingExpiry] = useState(false);
	const [expiryValues, setExpiryValues] = useState<
		Record<string, ExpiryFieldsValue>
	>({});
	// 在庫換算の設定などで、購入確定をやり直すときに、入力済みの期限を使い回す。
	const pendingLotsRef = useRef<Record<string, InventoryLotInput>>({});
	const today = useMemo(() => toDateString(new Date()), []);
	const [expiryEstimateLevel, setExpiryEstimateLevel] =
		useExpiryEstimateLevel();
	const lookupIngredientDefaults = useIngredientExpiryDefaults(ownerScope);

	const checkedItemCount = items.filter(
		(item) => item.status === "checked",
	).length;
	// 在庫に入る、チェック済みの商品（日用品は、在庫に入れない）。
	const checkedTrackedItems = items.filter(
		(item) => item.status === "checked" && isInventoryTrackedShoppingItem(item),
	);
	const conversionItem = conversionItemId
		? items.find((item) => item.id === conversionItemId)
		: undefined;

	// 期限の確認画面の、1商品分の初期値（目安の自動入力。設定がオフなら、種類の初期値だけ）。
	function buildPrefillFor(
		item: ShoppingItem,
		level: ExpiryEstimateLevel,
	): ExpiryFieldsValue {
		return buildExpiryPrefill({
			ingredientName: item.name,
			acquiredOn: today,
			level,
			learnedRemainingDays: getLearnedRemainingDays(item.name),
			userDefaults: lookupIngredientDefaults(item.name),
		});
	}

	// 目安の設定を変えたとき、ユーザーが日付を入力していない商品だけ、目安を入れ直す。
	function changeEstimateLevel(level: ExpiryEstimateLevel) {
		setExpiryEstimateLevel(level);
		setExpiryValues((current) =>
			Object.fromEntries(
				checkedTrackedItems.map((item) => {
					const currentValue = current[item.id];

					return [
						item.id,
						currentValue?.expirySource === "entered"
							? currentValue
							: buildPrefillFor(item, level),
					];
				}),
			),
		);
	}

	// 「チェック済みを購入確定」：在庫に入る商品があれば、先に、期限の確認画面を出す。なければ、そのまま確定する。
	function requestPurchase() {
		if (!ownerScope) {
			return;
		}

		setErrorMessage(null);
		setConversionErrors({});
		setConversionDrafts(
			Object.fromEntries(
				checkedTrackedItems
					.filter((item) => !item.inventoryConversion)
					.map((item) => [item.id, initialConversionDraft(item)]),
			),
		);

		if (checkedTrackedItems.length === 0) {
			pendingLotsRef.current = {};
			void confirm();

			return;
		}

		// 開くたびに、目安を入れる。入力済みの値（前に開いたときに入れたもの）は、残す。
		setExpiryValues((current) => ({
			...Object.fromEntries(
				checkedTrackedItems.map((item) => [
					item.id,
					buildPrefillFor(item, expiryEstimateLevel),
				]),
			),
			...current,
		}));
		setIsReviewingExpiry(true);
	}

	// 確認の画面で「購入確定」を押したとき。足りない換算を、先にすべて保存して、入力のある期限を載せて確定する。
	async function confirmWithExpiry() {
		const missingItems = checkedTrackedItems.filter(
			(item) => item.id in conversionDrafts,
		);
		const configurations: {
			item: ShoppingItem;
			configuration: ShoppingItemInventoryConfiguration;
		}[] = [];
		const errors: Record<string, string> = {};

		for (const item of missingItems) {
			const draft = conversionDrafts[item.id];

			if (!draft) {
				continue;
			}

			try {
				configurations.push({
					item,
					configuration: buildConversionConfiguration(item, draft),
				});
			} catch (error) {
				errors[item.id] = describeConversionDraftError(error);
			}
		}

		setConversionErrors(errors);

		if (Object.keys(errors).length > 0) {
			return;
		}

		const overwrites: ConversionOverwriteRequest[] = [];

		if (configurations.length > 0) {
			setIsSavingConversion(true);

			try {
				for (const { item, configuration } of configurations) {
					const updatedItem = await saveConversion(() =>
						updateShoppingItem(item, {
							name: item.name,
							quantity: configuration.quantity,
							unitLabel: configuration.unitLabel,
							inventoryConversion: configuration.inventoryConversion,
						}),
					);

					if (!updatedItem) {
						setErrorMessage(
							"換算を保存できませんでした。もう一度お試しください",
						);

						return;
					}

					// 決めた換算は、次から同じ食材の初期値にするため、覚える。記憶と違うときは、あとで聞く。
					const next: ShoppingConversionDefault = {
						unitLabel: configuration.unitLabel,
						inventoryConversion: configuration.inventoryConversion,
					};
					const previous = conversionMemory.lookup(
						item.name,
						configuration.unitLabel,
					);

					if (!previous) {
						await conversionMemory.remember(item.name, next);
					} else if (!isSameConversionDefault(previous, next)) {
						overwrites.push({ itemName: item.name, previous, next });
					}
				}
			} finally {
				setIsSavingConversion(false);
			}
		}

		const lotsByItemId: Record<string, InventoryLotInput> = {};

		for (const item of checkedTrackedItems) {
			const lot = toLotInput(expiryValues[item.id] ?? emptyExpiryFields);

			if (Object.keys(lot).length > 0) {
				lotsByItemId[item.id] = lot;
			}

			// 入力した期限（目安ではないもの）は、次の目安のために、覚える。
			const value = expiryValues[item.id];

			if (value?.expirySource === "entered" && value.expiresOn !== "") {
				recordExpiryHint({
					ingredientName: item.name,
					acquiredOn: today,
					expiresOn: value.expiresOn,
					storage: value.storage === "" ? null : value.storage,
				});
			}
		}

		pendingLotsRef.current = lotsByItemId;
		setIsReviewingExpiry(false);
		setConversionDrafts({});

		if (overwrites.length > 0) {
			setOverwriteQueue(overwrites);

			return;
		}

		await confirm();
	}

	async function confirm() {
		if (!ownerScope) {
			return;
		}

		setErrorMessage(null);
		setIsConfirmingPurchase(true);

		try {
			const result = await confirmPurchases(ownerScope, {
				lotsByItemId: pendingLotsRef.current,
			});

			if (result.status === "nothing-to-confirm") {
				return;
			}

			if (result.status === "missing-conversion") {
				const firstMissingItem = result.items[0];

				setConversionItemId(firstMissingItem?.id ?? null);

				setErrorMessage(
					firstMissingItem
						? `${firstMissingItem.name}の在庫換算を設定してください`
						: "在庫換算を設定してください",
				);

				return;
			}

			setConversionItemId(null);
			pendingLotsRef.current = {};
			setExpiryValues({});
			applyPurchasedItems(result.items);

			if (ownerScope === "guest" || !syncPurchases) {
				return;
			}

			try {
				const syncResult = await syncPurchases(ownerScope);

				if (syncResult.failedEntryId) {
					setErrorMessage(
						"購入は保存しました。在庫への反映は通信復旧後に再試行します",
					);
				}
			} catch {
				setErrorMessage(
					"購入は保存しました。在庫への反映は通信復旧後に再試行します",
				);
			}
		} catch {
			setErrorMessage("購入確定を保存できませんでした。もう一度お試しください");
		} finally {
			setIsConfirmingPurchase(false);
		}
	}

	async function saveInventoryConfiguration(
		item: ShoppingItem,
		configuration: ShoppingItemInventoryConfiguration,
	) {
		setIsSavingConversion(true);

		try {
			const updatedItem = await saveConversion(() =>
				updateShoppingItem(item, {
					name: item.name,
					quantity: configuration.quantity,
					unitLabel: configuration.unitLabel,
					inventoryConversion: configuration.inventoryConversion,
				}),
			);

			if (!updatedItem) {
				return;
			}

			setConversionItemId(null);

			// 決めた換算は、次から同じ食材の初期値にするため、覚える。
			// 記憶と違うときは、覚え直すかを聞いてから、購入確定をやり直す。
			const next: ShoppingConversionDefault = {
				unitLabel: configuration.unitLabel,
				inventoryConversion: configuration.inventoryConversion,
			};
			const previous = conversionMemory.lookup(
				item.name,
				configuration.unitLabel,
			);

			if (!previous) {
				await conversionMemory.remember(item.name, next);
			} else if (!isSameConversionDefault(previous, next)) {
				setOverwriteQueue([{ itemName: item.name, previous, next }]);

				return;
			}

			/*
			 * Dexieへの換算保存が完了しているため、
			 * 購入確定を最初から再試行する。
			 */
			await confirm();
		} finally {
			setIsSavingConversion(false);
		}
	}

	// 記憶と違う換算の確認への答え。「変える」なら記憶を置き換える。残りがなければ、購入確定を続ける。
	async function answerConversionOverwrite(choice: "replace" | "once") {
		const request = overwriteRequest;

		if (!request) {
			return;
		}

		setOverwriteQueue((queue) => queue.slice(1));

		if (choice === "replace") {
			await conversionMemory.remember(request.itemName, request.next);
		}

		if (overwriteQueue.length <= 1) {
			await confirm();
		}
	}

	function cancelConversion() {
		setConversionItemId(null);
		setErrorMessage(null);
	}

	return {
		checkedItemCount,
		checkedTrackedItems,
		conversionItem,
		isConfirmingPurchase,
		isSavingConversion,
		isReviewingExpiry,
		expiryValues,
		expiryEstimateLevel,
		today,
		setExpiryValues,
		cancelExpiryReview: () => {
			setIsReviewingExpiry(false);
			setConversionDrafts({});
			setConversionErrors({});
		},
		conversionDrafts,
		conversionErrors,
		changeConversionDraft: (itemId: string, draft: ConversionDraft) =>
			setConversionDrafts((current) => ({ ...current, [itemId]: draft })),
		changeEstimateLevel,
		requestPurchase,
		confirmWithExpiry,
		saveInventoryConfiguration,
		overwriteRequest,
		answerConversionOverwrite,
		cancelConversion,
	};
}
