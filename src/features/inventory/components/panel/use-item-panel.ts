import { useCallback, useMemo, useState } from "react";
import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import {
	listStockUnitOptions,
	type StockUnitOption,
} from "#/features/ingredients/domain/list-stock-unit-options";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import { createManualInventoryAdjustment } from "../../application/create-manual-inventory-adjustment";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { ChangeInventoryTrackingModeCommand } from "../../application/inventory-tracking-mode-repository";
import type { InventoryOperation } from "../../domain/apply-inventory-adjustment";
import { type InventoryLot, toDateString } from "../../domain/inventory-lot";
import type { QuantityTrackingMode } from "../../domain/inventory-tracking-mode";
import { recordExpiryHint } from "../../infrastructure/expiry-hints-storage";
import { type ExpiryFieldsValue, emptyExpiryFields } from "../expiry-fields";
import type { InventoryActions } from "./inventory-actions";

// パネルの本体か、本体に差し替える6つのフォーム（削除は確認のダイアログ）。
export type ItemPanelView =
	| { name: "main" }
	| { name: "adjust" }
	| { name: "lot-quantity"; lotId: string }
	| { name: "lot-expiry"; lotId: string }
	| { name: "unit" }
	| { name: "rename" }
	| { name: "tracking" };

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
	const [adjustQuantity, setAdjustQuantity] = useState("1");
	const [isLotSpecified, setIsLotSpecified] = useState(false);
	const [adjustLotQuantities, setAdjustLotQuantities] = useState<
		Record<string, string>
	>({});
	// ロットの数量
	const [lotQuantityValue, setLotQuantityValue] = useState("");
	// ロットの期限
	const [lotExpiry, setLotExpiry] =
		useState<ExpiryFieldsValue>(emptyExpiryFields);
	const [saveAsDefault, setSaveAsDefault] = useState(false);
	// 単位
	const [unitOption, setUnitOption] = useState("");
	const [unitLotQuantities, setUnitLotQuantities] = useState<
		Record<string, string>
	>({});
	// 呼び名
	const [renameValue, setRenameValue] = useState("");
	// 量を追う管理にする
	const [trackingQuantity, setTrackingQuantity] = useState("");
	const [trackingMode, setTrackingMode] =
		useState<QuantityTrackingMode>("estimated");

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
			setErrorMessage(error instanceof Error ? error.message : fallback);

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
	function openAdjust() {
		setErrorMessage(null);
		setAdjustQuantity("1");
		setIsLotSpecified(false);
		setAdjustLotQuantities({});
		setView({ name: "adjust" });
	}

	function openLotQuantity(lot: InventoryLot) {
		setErrorMessage(null);
		setLotQuantityValue(
			formatQuantity(lot.quantity, {
				grouping: false,
				allowFractions: item.stockUnitCode === "count",
			}),
		);
		setView({ name: "lot-quantity", lotId: lot.id });
	}

	function openLotExpiry(lot: InventoryLot) {
		setErrorMessage(null);
		// 空の項目は、食材の初期値（ユーザーが決めたもの）を入れる。
		setLotExpiry({
			expiresOn: lot.expiresOn ?? "",
			expiryKind: lot.expiryKind ?? item.defaultExpiryKind ?? "",
			storage: lot.storage ?? item.defaultStorage ?? "",
			// 自動の目安だった日付は、そのまま保存しても、目安のまま（直したときに、入力になる）。
			expirySource: lot.expirySource ?? "",
		});
		setSaveAsDefault(false);
		setView({ name: "lot-expiry", lotId: lot.id });
	}

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
		setTrackingMode("estimated");
		setView({ name: "tracking" });
	}

	// ---- 実行 ----
	async function adjust(operation: InventoryOperation): Promise<boolean> {
		const { adjustInventoryItem } = actions;

		if (!adjustInventoryItem) {
			return false;
		}

		// ロットを指定して減らすときは、数量が入っているロットだけを、そのまま送る。
		const allocations =
			operation === "decrease" && isLotSpecified
				? item.lots.flatMap((lot) => {
						const quantity =
							parseQuantityInput(adjustLotQuantities[lot.id] ?? "") ?? 0;

						return quantity > 0 ? [{ lotId: lot.id, quantity }] : [];
					})
				: undefined;

		if (allocations && allocations.length === 0) {
			setErrorMessage("減らすロットの数量を入力してください");

			return false;
		}

		const done = await attempt("在庫数量を変更できませんでした", async () => {
			const result = await adjustInventoryItem(
				createManualInventoryAdjustment({
					inventoryItemId: item.inventoryItemId,
					quantity: allocations
						? allocations.reduce(
								(sum, allocation) => sum + allocation.quantity,
								0,
							)
						: (parseQuantityInput(adjustQuantity) ?? Number.NaN),
					stockUnitCode: item.stockUnitCode,
					operation,
					allocations,
				}),
			);

			onUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
			});
		});

		if (done) {
			goMain();
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

	async function saveLotQuantity(lotId: string): Promise<boolean> {
		const { setLotQuantity } = actions;

		if (!setLotQuantity) {
			return false;
		}

		const quantity = parseQuantityInput(lotQuantityValue);

		if (quantity === null) {
			setErrorMessage(quantityError);

			return false;
		}

		const done = await attempt("数量を直せませんでした", async () => {
			const result = await setLotQuantity({ lotId, quantity });

			onUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
			});
		});

		if (done) {
			goMain();
		}

		return done;
	}

	async function saveLotExpiry(lot: InventoryLot): Promise<boolean> {
		const { updateInventoryLot } = actions;

		if (!updateInventoryLot) {
			return false;
		}

		const done = await attempt("ロットを更新できませんでした", async () => {
			const result = await updateInventoryLot({
				lotId: lot.id,
				expiresOn: lotExpiry.expiresOn === "" ? null : lotExpiry.expiresOn,
				expirySource:
					lotExpiry.expirySource === "" ? null : lotExpiry.expirySource,
				expiryKind: lotExpiry.expiryKind === "" ? null : lotExpiry.expiryKind,
				storage: lotExpiry.storage === "" ? null : lotExpiry.storage,
				saveAsIngredientDefault: saveAsDefault,
			});

			onUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
				defaultExpiryKind: result.defaultExpiryKind,
				defaultStorage: result.defaultStorage,
			});

			// 入力した期限（目安ではないもの）は、次の目安のために、覚える。
			if (lotExpiry.expirySource === "entered" && lotExpiry.expiresOn !== "") {
				recordExpiryHint({
					ingredientName: item.name,
					acquiredOn: lot.acquiredOn,
					expiresOn: lotExpiry.expiresOn,
					storage: lotExpiry.storage === "" ? null : lotExpiry.storage,
				});
			}
		});

		if (done) {
			goMain();
		}

		return done;
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

	// 有無だけ → 量を追う管理に変える（フォームの「この量で管理する」）。
	async function startTracking(): Promise<boolean> {
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
			isLotSpecified,
			setIsLotSpecified,
			lotQuantities: adjustLotQuantities,
			setLotQuantity: (lotId: string, value: string) =>
				setAdjustLotQuantities((current) => ({ ...current, [lotId]: value })),
		},
		lotQuantityForm: { value: lotQuantityValue, setValue: setLotQuantityValue },
		lotExpiryForm: {
			value: lotExpiry,
			setValue: setLotExpiry,
			saveAsDefault,
			setSaveAsDefault,
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
			adjust: openAdjust,
			lotQuantity: openLotQuantity,
			lotExpiry: openLotExpiry,
			unit: openUnit,
			rename: openRename,
			tracking: openTracking,
		},
		run: {
			adjust,
			togglePresence,
			saveLotQuantity,
			saveLotExpiry,
			changeUnit,
			rename,
			changeTracking,
			startTracking,
			remove,
		},
	};
}
