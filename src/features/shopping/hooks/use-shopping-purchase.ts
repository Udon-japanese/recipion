import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { subscribePurchaseSyncStarted } from "#/features/inventory/application/purchase-sync-events";
import type { SyncInventoryPurchaseOutboxResult } from "#/features/inventory/application/sync-inventory-purchase-outbox";
import {
	type ExpiryFieldsValue,
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
import { getLearnedRemainingDays } from "#/features/inventory/infrastructure/expiry-hints-storage";
import { preferMeasureUnit } from "#/features/quantity/infrastructure/measure-unit-preference-storage";
import {
	type AmountDraft,
	buildAmountConfiguration,
	describeAmountDraftError,
	initialAmountDraft,
} from "../domain/amount-draft";
import type { ShoppingItemInventoryConfiguration } from "../domain/conversion-draft";
import { needsConversionQuestion } from "../domain/infer-inventory-conversion";
import type {
	ShoppingConversionDefault,
	ShoppingConversionMemoryValue,
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
	setErrorMessage: Dispatch<SetStateAction<string | null>>;
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
			value: ShoppingConversionMemoryValue,
		) => Promise<void>;
	};
};

// チェック済みの購入確定の流れ（期限の確認 → 確定 → 在庫換算の設定 → 在庫への反映）。
// 購入確定のあと、在庫へ送れなかったときの文（送れたら null）。理由ごとに、次に何が起きるかを伝える。
function describePurchaseSyncProblem(
	result: SyncInventoryPurchaseOutboxResult,
): string | null {
	if (result.stoppedBy === "offline") {
		return "購入は保存しました。通信が戻ったら、在庫に入れます";
	}

	if (result.stoppedBy === "account") {
		return "購入は保存しました。ログインの状態を確かめられないため、在庫にはまだ入れていません";
	}

	const rejected = result.failures.filter(
		(failure) => failure.kind === "rejected",
	);

	if (rejected.length > 0) {
		return `購入は保存しました。在庫に入れられなかったものがあります：${rejected
			.map((failure) => `${failure.ingredientName}（${failure.message}）`)
			.join("、")}`;
	}

	if (result.failures.length > 0) {
		return "購入は保存しました。サーバーで在庫に入れられなかったため、あとでもう一度送ります";
	}

	return null;
}

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
	// 購入確定のあと、在庫へ送れなかったときに出した文。在庫へ送り始めたら（通信が戻った・画面に戻った・再試行など）消す。
	const syncProblemRef = useRef<string | null>(null);

	useEffect(
		() =>
			subscribePurchaseSyncStarted(() => {
				const shown = syncProblemRef.current;

				if (shown === null) {
					return;
				}

				syncProblemRef.current = null;
				// そのあとに別の文が出ていれば、それは消さない。
				setErrorMessage((current) => (current === shown ? null : current));
			}),
		[setErrorMessage],
	);
	const [isSavingConversion, setIsSavingConversion] = useState(false);
	// 購入確定の確認画面で、換算が足りない商品の、入力途中の換算（商品の ID ごと）と、その誤り。
	const [conversionDrafts, setAmountDrafts] = useState<
		Record<string, AmountDraft>
	>({});
	const [conversionErrors, setConversionErrors] = useState<
		Record<string, string>
	>({});

	// 在庫換算が足りない商品があるとき、購入確定の前に、量を聞く画面。
	const [isReviewingConversion, setIsReviewingConversion] = useState(false);
	// 量を聞く商品（画面で見つけたもの。保存の直前の確かめで見つかったものも）。
	const [reviewItems, setReviewItems] = useState<ShoppingItem[]>([]);
	// 換算がそろっているとき、購入確定の前に、確かめる確認。
	const [isAskingPurchase, setIsAskingPurchase] = useState(false);
	// 在庫換算の設定などで、購入確定をやり直すときに、期限の目安を使い回す。
	const pendingLotsRef = useRef<Record<string, InventoryLotInput>>({});
	const today = useMemo(() => toDateString(new Date()), []);
	const [expiryEstimateLevel] = useExpiryEstimateLevel();
	const lookupIngredientDefaults = useIngredientExpiryDefaults(ownerScope);

	const checkedItemCount = items.filter(
		(item) => item.status === "checked",
	).length;
	// 在庫に入る、チェック済みの商品（日用品は、在庫に入れない）。
	const checkedTrackedItems = items.filter(
		(item) => item.status === "checked" && isInventoryTrackedShoppingItem(item),
	);
	// 量を聞く商品は、画面の一覧の新しい内容で見る（一覧にまだ届いていなければ、見つけたときの内容）。
	const conversionReviewItems = reviewItems.map(
		(reviewItem) =>
			items.find((item) => item.id === reviewItem.id) ?? reviewItem,
	);

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

	// 在庫に入る商品の、期限と保存方法の初期値（自動の目安）。直したいときは、在庫の画面で直す。
	function buildLotsFromPrefill(): Record<string, InventoryLotInput> {
		const lotsByItemId: Record<string, InventoryLotInput> = {};

		for (const item of checkedTrackedItems) {
			const lot = toLotInput(buildPrefillFor(item, expiryEstimateLevel));

			if (Object.keys(lot).length > 0) {
				lotsByItemId[item.id] = lot;
			}
		}

		return lotsByItemId;
	}

	// 「チェック済みを購入確定」：在庫換算が足りない商品があれば、先に、量を聞く画面を出す。なければ、そのまま確定する。
	function requestPurchase() {
		if (!ownerScope) {
			return;
		}

		setErrorMessage(null);
		setConversionErrors({});

		// 換算が未設定の項目に、量を聞く（g・kg・ml・l で買うものは、聞かずに、確定のときにその単位で入る）。
		const missingItems = checkedTrackedItems.filter(needsConversionQuestion);
		const drafts = Object.fromEntries(
			missingItems.map((item) => [
				item.id,
				initialAmountDraft(item, (unit) => preferMeasureUnit(item.name, unit)),
			]),
		);

		setReviewItems(missingItems);
		setAmountDrafts(drafts);

		// 在庫に入る商品がない（日用品だけ）ときは、在庫に影響しないので、確認なしで確定する。
		if (checkedTrackedItems.length === 0) {
			pendingLotsRef.current = {};
			void confirm();

			return;
		}

		if (Object.keys(drafts).length === 0) {
			setIsAskingPurchase(true);

			return;
		}

		setIsReviewingConversion(true);
	}

	// 確認で「購入確定」を押したとき。
	function confirmAskedPurchase() {
		setIsAskingPurchase(false);
		pendingLotsRef.current = buildLotsFromPrefill();
		void confirm();
	}

	// 量を聞く画面で「購入確定」を押したとき。足りない換算を、先にすべて保存して、確定する。
	async function confirmWithConversions() {
		const missingItems = conversionReviewItems.filter(
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
					configuration: buildAmountConfiguration(item, draft),
				});
			} catch (error) {
				errors[item.id] = describeAmountDraftError(error);
			}
		}

		setConversionErrors(errors);

		if (Object.keys(errors).length > 0) {
			return;
		}

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

					// 決めた換算は、次から同じ食材の候補・初期値にするため、覚える（記憶と違っても、別の1件として残る）。
					await conversionMemory.remember(item.name, {
						unitLabel: configuration.unitLabel,
						quantity: configuration.quantity,
						inventoryConversion: configuration.inventoryConversion,
					});
				}
			} finally {
				setIsSavingConversion(false);
			}
		}

		pendingLotsRef.current = buildLotsFromPrefill();
		setIsReviewingConversion(false);
		setReviewItems([]);
		setAmountDrafts({});

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

			// 画面で聞いたあとに、換算のない商品が見つかった（別の画面でチェックした、換算の保存が途中で失敗した、など）。
			// その商品の量を、同じ「在庫に入れる量」の画面で聞く。
			if (result.status === "missing-conversion") {
				setReviewItems(result.items);
				setAmountDrafts(
					Object.fromEntries(
						result.items.map((item) => [
							item.id,
							initialAmountDraft(item, (unit) =>
								preferMeasureUnit(item.name, unit),
							),
						]),
					),
				);
				setConversionErrors({});
				setIsReviewingConversion(true);

				return;
			}

			pendingLotsRef.current = {};
			applyPurchasedItems(result.items);

			if (ownerScope === "guest" || !syncPurchases) {
				return;
			}

			let problem: string | null;

			try {
				problem = describePurchaseSyncProblem(await syncPurchases(ownerScope));
			} catch {
				problem = "購入は保存しました。在庫への反映は、あとでもう一度試します";
			}

			syncProblemRef.current = problem;
			setErrorMessage(problem);
		} catch {
			setErrorMessage("購入確定を保存できませんでした。もう一度お試しください");
		} finally {
			setIsConfirmingPurchase(false);
		}
	}

	return {
		checkedItemCount,
		checkedTrackedItems,
		conversionReviewItems,
		isConfirmingPurchase,
		// 量を聞く画面で、足りない換算を保存しているあいだ（二重に押されないように）。
		isSavingConversion,
		isReviewingConversion,
		isAskingPurchase,
		confirmAskedPurchase,
		cancelAskedPurchase: () => setIsAskingPurchase(false),
		cancelReview: () => {
			setIsReviewingConversion(false);
			setReviewItems([]);
			setAmountDrafts({});
			setConversionErrors({});
		},
		conversionDrafts,
		conversionErrors,
		changeAmountDraft: (itemId: string, draft: AmountDraft) =>
			setAmountDrafts((current) => ({ ...current, [itemId]: draft })),
		requestPurchase,
		confirmWithConversions,
	};
}
