import { useCallback, useMemo, useState } from "react";
import { describeError } from "#/errors/user-facing-error";
import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import {
	listStockUnitOptions,
	type StockUnitOption,
} from "#/features/ingredients/domain/list-stock-unit-options";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import { initialQuantityInput } from "#/features/quantity/domain/quantity-buttons";
import { createManualInventoryAdjustment } from "../../application/create-manual-inventory-adjustment";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { ChangeInventoryTrackingModeCommand } from "../../application/inventory-tracking-mode-repository";
import type { InventoryOperation } from "../../domain/apply-inventory-adjustment";
import {
	type InventoryLot,
	type InventoryLotPurchaseUnit,
	isSamePurchaseUnit,
	toDateString,
} from "../../domain/inventory-lot";
import type { InventoryTrackingMode } from "../../domain/inventory-tracking-mode";
import { convertLotUnitAmount } from "../../domain/lot-unit-decrease";
import { rememberAmount } from "../../infrastructure/amount-memory-storage";
import { recordExpiryHint } from "../../infrastructure/expiry-hints-storage";
import type { ExpiryFieldsValue } from "../expiry-fields";
import type { InventoryActions } from "./inventory-actions";

// パネルの本体か、本体に差し替える3つのフォーム（使った・買い足した・内訳の直しは、本体の中。削除などは確認のダイアログ）。
export type ItemPanelView =
	| { name: "main" }
	| { name: "unit" }
	| { name: "rename" }
	| { name: "tracking" };

// 「使った」「買い足した」の打ち方：打った単位（省略は在庫の単位）と、打った量を覚えるか（省略は覚える）。
export type AdjustOptions = { unitLabel?: string; remember?: boolean };

const quantityError = "数量を確認してください（例：2、0.5、1/2）";

export function toOptionValue(option: StockUnitOption): string {
	return `${option.stockUnitCode}:${option.stockUnitLabel}`;
}

export function isCurrentUnit(
	item: InventoryListItem,
	option: StockUnitOption,
) {
	return (
		option.stockUnitCode === item.stockUnitCode &&
		option.stockUnitLabel === item.stockUnitLabel
	);
}

// 内訳の期限の欄の、はじめの値。空の項目は、食材の初期値（ユーザーが決めたもの）を入れる。
export function lotExpiryValue(
	item: InventoryListItem,
	lot: InventoryLot,
): ExpiryFieldsValue {
	return {
		expiresOn: lot.expiresOn ?? "",
		expiryKind: lot.expiryKind ?? item.defaultExpiryKind ?? "",
		storage: lot.storage ?? item.defaultStorage ?? "",
		// 自動の目安だった日付は、そのまま保存しても、目安のまま（直したときに、入力になる）。
		expirySource: lot.expirySource ?? "",
	};
}

type Options = {
	item: InventoryListItem;
	actions: InventoryActions;
	onUpdate: (
		inventoryItemId: string,
		update: Partial<InventoryListItem>,
	) => void;
	onDeleted: (inventoryItemId: string) => void;
};

// 食材のパネルの、状態（どのフォームか・入力中の値）と、操作。
// 操作は、成功したら true を返す（失敗は、エラーの文を出して false）。
export function useItemPanel({ item, actions, onUpdate, onDeleted }: Options) {
	const [view, setView] = useState<ItemPanelView>({ name: "main" });
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// 調整
	const [adjustQuantity, setAdjustQuantity] = useState(() =>
		initialQuantityInput(item.stockUnitLabel),
	);
	// 単位
	const [unitOption, setUnitOption] = useState("");
	const [unitLotQuantities, setUnitLotQuantities] = useState<
		Record<string, string>
	>({});
	// 呼び名
	const [renameValue, setRenameValue] = useState("");
	// 数え方を変える（数えない → 数える、のときだけ、いまの量を入れてもらう）
	const [trackingQuantity, setTrackingQuantity] = useState("");
	const [trackingMode, setTrackingMode] = useState<InventoryTrackingMode>(
		item.trackingMode,
	);

	const today = useMemo(() => toDateString(new Date()), []);

	const goMain = useCallback(() => {
		setView({ name: "main" });
		setErrorMessage(null);
	}, []);

	// 通信の呼び出しを包む：エラーの文を出して false、成功なら true。
	async function attempt(
		fallback: string,
		action: () => Promise<void>,
	): Promise<boolean> {
		setErrorMessage(null);

		try {
			await action();

			return true;
		} catch (error) {
			setErrorMessage(describeError(error, fallback));

			return false;
		}
	}

	function estimateQuantityInUnit(
		quantity: number,
		option: StockUnitOption,
	): string {
		const converted = convertToStockQuantity(
			{
				quantity,
				unitLabel:
					item.stockUnitCode === "count"
						? item.stockUnitLabel
						: item.stockUnitCode,
				stockUnitCode: option.stockUnitCode,
				stockUnitLabel: option.stockUnitLabel,
			},
			findIngredientCatalogEntry(item.name),
		);

		if (converted === null) {
			return "";
		}

		// g・ml は丸める（個数は、分数のまま。入力欄で編集できるように、桁区切りは付けない）。
		const rounded =
			option.stockUnitCode === "count"
				? converted
				: converted >= 10
					? Math.round(converted)
					: Math.round(converted * 10) / 10;

		return formatQuantity(rounded, {
			grouping: false,
			allowFractions: option.stockUnitCode === "count",
		});
	}

	function estimateLotQuantities(option: StockUnitOption) {
		return Object.fromEntries(
			item.lots.map((lot) => [
				lot.id,
				estimateQuantityInUnit(lot.quantity, option),
			]),
		);
	}

	// ---- フォームを開く ----
	function openUnit() {
		const [first] = listStockUnitOptions(item.name).filter(
			(option) => !isCurrentUnit(item, option),
		);

		setErrorMessage(null);

		if (first) {
			setUnitOption(toOptionValue(first));
			setUnitLotQuantities(estimateLotQuantities(first));
		} else {
			setUnitOption("");
			setUnitLotQuantities({});
		}

		setView({ name: "unit" });
	}

	function chooseUnit(value: string) {
		const option = listStockUnitOptions(item.name).find(
			(candidate) => toOptionValue(candidate) === value,
		);

		setUnitOption(value);

		if (option) {
			setUnitLotQuantities(estimateLotQuantities(option));
		}
	}

	function openRename() {
		setErrorMessage(null);
		setRenameValue(item.displayName ?? "");
		setView({ name: "rename" });
	}

	function openTracking() {
		setErrorMessage(null);
		setTrackingQuantity("");
		setTrackingMode(item.trackingMode);
		setView({ name: "tracking" });
	}

	// ---- 実行 ----
	// 「使った」「買い足した」。lot を渡すと、その入れた分だけを増減する（入れた分の編集）。
	// unitLabel が在庫の単位でなければ（1個＝110g の g など）、ロットの換算で、在庫の単位に直して引く。
	// 成功したら、打った量を、打った単位のまま、次のチップのために覚える（remember が false なら、覚えない）。
	async function adjust(
		operation: InventoryOperation,
		quantityText: string,
		{
			lot,
			unitLabel = item.stockUnitLabel,
			remember = true,
		}: AdjustOptions & { lot?: InventoryLot } = {},
	): Promise<boolean> {
		const { adjustInventoryItem } = actions;

		if (!adjustInventoryItem) {
			return false;
		}

		const typed = parseQuantityInput(quantityText);

		if (typed === null || !(typed > 0)) {
			setErrorMessage(quantityError);

			return false;
		}

		const quantity =
			unitLabel === item.stockUnitLabel
				? typed
				: convertLotUnitAmount(
						lot ? [lot] : item.lots,
						{ quantity: typed, unitLabel },
						item,
					);

		if (quantity === null) {
			setErrorMessage(
				`${unitLabel}から${item.stockUnitLabel}に直せませんでした。${item.stockUnitLabel}で打ってください`,
			);

			return false;
		}

		return attempt("在庫数量を変更できませんでした", async () => {
			const result = await adjustInventoryItem(
				createManualInventoryAdjustment({
					inventoryItemId: item.inventoryItemId,
					quantity,
					stockUnitCode: item.stockUnitCode,
					operation,
					allocations: lot ? [{ lotId: lot.id, quantity }] : undefined,
				}),
			);

			onUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
			});
			if (remember) {
				rememberAmount({
					ingredientName: item.name,
					stockUnitLabel: unitLabel,
					amount: typed,
				});
			}
		});
	}

	// パネルの本体の量の欄。成功したら、次の入力のために、はじめの値に戻す。
	async function adjustItem(
		operation: InventoryOperation,
		options: AdjustOptions = {},
	): Promise<boolean> {
		const done = await adjust(operation, adjustQuantity, options);

		if (done) {
			setAdjustQuantity(
				initialQuantityInput(options.unitLabel ?? item.stockUnitLabel),
			);
		}

		return done;
	}

	// 有無だけの食材の「ある」「なくなった」。
	async function togglePresence(operation: InventoryOperation) {
		const { adjustInventoryItem } = actions;

		if (!adjustInventoryItem) {
			return false;
		}

		return attempt("在庫を変更できませんでした", async () => {
			const result = await adjustInventoryItem(
				createManualInventoryAdjustment({
					inventoryItemId: item.inventoryItemId,
					quantity: 1,
					stockUnitCode: item.stockUnitCode,
					operation,
				}),
			);

			onUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
			});
		});
	}

	// 内訳の1行の期限・期限の種類・保存方法・食材の初期値を、その場で直す（量は、adjust で増減する）。
	// 保存したあとも、パネルは、本体のまま。
	async function saveLotEdits(
		lot: InventoryLot,
		edits: {
			expiry: ExpiryFieldsValue;
			saveAsDefault: boolean;
			purchaseUnit: InventoryLotPurchaseUnit | null;
		},
	): Promise<boolean> {
		const { updateInventoryLot } = actions;

		if (!updateInventoryLot) {
			return false;
		}

		return attempt("内訳を直せませんでした", async () => {
			const expiry = edits.expiry;
			const isDateChanged = expiry.expiresOn !== (lot.expiresOn ?? "");
			const result = await updateInventoryLot({
				lotId: lot.id,
				expiresOn: expiry.expiresOn === "" ? null : expiry.expiresOn,
				// 日付を直したときは、入力（期限の欄が決める）。直していないときは、これまでの出所のまま。
				expirySource:
					expiry.expiresOn === "" || expiry.expirySource === ""
						? null
						: expiry.expirySource,
				expiryKind: expiry.expiryKind === "" ? null : expiry.expiryKind,
				storage: expiry.storage === "" ? null : expiry.storage,
				saveAsIngredientDefault: edits.saveAsDefault,
				// 換算は、直したときだけ送る（送らなければ、そのまま）。
				...(isSamePurchaseUnit(lot.purchaseUnit, edits.purchaseUnit)
					? {}
					: { purchaseUnit: edits.purchaseUnit }),
			});

			onUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
				defaultExpiryKind: result.defaultExpiryKind,
				defaultStorage: result.defaultStorage,
			});

			// 入力した期限は、次の目安のために、覚える。
			if (
				isDateChanged &&
				expiry.expiresOn !== "" &&
				expiry.expirySource === "entered"
			) {
				recordExpiryHint({
					ingredientName: item.name,
					acquiredOn: lot.acquiredOn,
					expiresOn: expiry.expiresOn,
					storage: expiry.storage === "" ? null : expiry.storage,
				});
			}
		});
	}

	async function changeUnit(): Promise<boolean> {
		const { changeStockUnit } = actions;

		if (!changeStockUnit) {
			return false;
		}

		const option = listStockUnitOptions(item.name).find(
			(candidate) => toOptionValue(candidate) === unitOption,
		);

		if (!option) {
			return false;
		}

		// ロットごとの数量（空のロットは、サーバーが換算する）。
		const lotQuantities: { lotId: string; quantity: number }[] = [];

		for (const lot of item.lots) {
			const text = unitLotQuantities[lot.id] ?? "";

			if (text.trim() === "") {
				continue;
			}

			const quantity = parseQuantityInput(text);

			if (quantity === null) {
				setErrorMessage(quantityError);

				return false;
			}

			lotQuantities.push({ lotId: lot.id, quantity });
		}

		const done = await attempt("単位を変更できませんでした", async () => {
			const result = await changeStockUnit({
				inventoryItemId: item.inventoryItemId,
				stockUnitCode: option.stockUnitCode,
				stockUnitLabel: option.stockUnitLabel,
				lotQuantities,
			});

			onUpdate(item.inventoryItemId, {
				stockUnitCode: result.stockUnitCode,
				stockUnitLabel: result.stockUnitLabel,
				quantity: result.quantity,
				lots: result.lots,
			});
		});

		if (done) {
			goMain();
		}

		return done;
	}

	async function rename(): Promise<boolean> {
		const { renameInventoryItem } = actions;

		if (!renameInventoryItem) {
			return false;
		}

		const done = await attempt("名前を変更できませんでした", async () => {
			const result = await renameInventoryItem({
				inventoryItemId: item.inventoryItemId,
				displayName: renameValue.trim() === "" ? null : renameValue,
			});

			onUpdate(item.inventoryItemId, { displayName: result.displayName });
		});

		if (done) {
			goMain();
		}

		return done;
	}

	async function changeTracking(
		command: Omit<ChangeInventoryTrackingModeCommand, "inventoryItemId">,
	): Promise<boolean> {
		const { changeTrackingMode } = actions;

		if (!changeTrackingMode) {
			return false;
		}

		const done = await attempt("管理方法を変更できませんでした", async () => {
			const result = await changeTrackingMode({
				inventoryItemId: item.inventoryItemId,
				...command,
			});

			onUpdate(item.inventoryItemId, {
				trackingMode: result.trackingMode,
				quantity: result.quantity,
				lots: result.lots,
			});
		});

		if (done) {
			goMain();
		}

		return done;
	}

	// 数え方を変える（フォームの「この数え方にする」）。数えない → 数える、のときは、入れてもらった、いまの量にする。
	async function applyTracking(): Promise<boolean> {
		if (item.trackingMode !== "presence" || trackingMode === "presence") {
			return changeTracking({ trackingMode });
		}

		const quantity =
			trackingQuantity.trim() === "" ? 0 : parseQuantityInput(trackingQuantity);

		if (quantity === null) {
			setErrorMessage(quantityError);

			return false;
		}

		return changeTracking({ trackingMode, currentQuantity: quantity });
	}

	async function remove(): Promise<boolean> {
		const { deleteInventoryItem } = actions;

		if (!deleteInventoryItem) {
			return false;
		}

		const done = await attempt("在庫を削除できませんでした", async () => {
			await deleteInventoryItem(item.inventoryItemId);
		});

		if (done) {
			onDeleted(item.inventoryItemId);
		}

		return done;
	}

	return {
		view,
		goMain,
		today,
		errorMessage,
		setErrorMessage,
		adjustForm: {
			quantity: adjustQuantity,
			setQuantity: setAdjustQuantity,
		},
		unitForm: {
			option: unitOption,
			choose: chooseUnit,
			lotQuantities: unitLotQuantities,
			setLotQuantity: (lotId: string, value: string) =>
				setUnitLotQuantities((current) => ({ ...current, [lotId]: value })),
		},
		renameForm: { value: renameValue, setValue: setRenameValue },
		trackingForm: {
			quantity: trackingQuantity,
			setQuantity: setTrackingQuantity,
			mode: trackingMode,
			setMode: setTrackingMode,
		},
		open: {
			unit: openUnit,
			rename: openRename,
			tracking: openTracking,
		},
		run: {
			adjustItem,
			adjustLot: (
				lot: InventoryLot,
				operation: InventoryOperation,
				quantityText: string,
				options: AdjustOptions = {},
			) => adjust(operation, quantityText, { ...options, lot }),
			togglePresence,
			saveLotEdits,
			changeUnit,
			rename,
			applyTracking,
			remove,
		},
	};
}
