import { type SubmitEvent, useEffect, useMemo, useState } from "react";
import * as v from "valibot";
import { useButtonAction } from "#/components/button/use-button-action";
import { describeError } from "#/errors/user-facing-error";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
	type IngredientPurchasePreset,
} from "#/features/ingredients/domain/ingredient-catalog";
import {
	listStockUnitOptions,
	type StockUnitOption,
} from "#/features/ingredients/domain/list-stock-unit-options";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	parseRegisterInventoryItemInput,
	type RegisterInventoryItemInput,
} from "../../application/register-inventory-item";
import type { InventoryTrackingMode } from "../../domain/apply-inventory-adjustment";
import {
	buildExpiryPrefill,
	type IngredientExpiryDefaults,
} from "../../domain/build-expiry-prefill";
import type { ExpiryEstimateLevel } from "../../domain/estimate-lot-expiry";
import {
	type InventoryLotPurchaseUnit,
	toDateString,
} from "../../domain/inventory-lot";
import { inventoryTrackingModeSchema } from "../../domain/inventory-tracking-mode";
import {
	collectPurchaseUnitCandidates,
	emptyPurchaseUnitDraft,
	type PurchaseUnitDraft,
	parsePurchaseUnitDraft,
} from "../../domain/purchase-unit-draft";
import type { PurchaseUnitMemory } from "../../hooks/use-purchase-unit-memory";
import {
	getLearnedRemainingDays,
	recordExpiryHint,
} from "../../infrastructure/expiry-hints-storage";
import {
	type ExpiryFieldsValue,
	emptyExpiryFields,
	toLotInput,
} from "../expiry-fields";

export const customUnitValue = "custom";

export function toUnitValue(option: StockUnitOption): string {
	return `${option.stockUnitCode}:${option.stockUnitLabel}`;
}

export type RegisteredInfo = {
	// 登録した食材（サーバーが答えたときだけ）。追加した食材のタイルに、輪を出すために使う。
	inventoryItemId: string | null;
};

type UseInventoryRegistrationOptions = {
	registerInventoryItem: (
		input: RegisterInventoryItemInput,
	) => Promise<unknown>;
	onRegistered: (info: RegisteredInfo) => void;
	// 期限の目安の自動入力のレベル（省略は「確実なものだけ」）。
	expiryEstimateLevel?: ExpiryEstimateLevel;
	// ユーザーが決めた、食材の期限の種類・保存方法（初期値として使う）。
	lookupIngredientDefaults?: (
		ingredientName: string,
	) => IngredientExpiryDefaults | null;
	// 買い物メモの換算の記憶（候補と、決めた換算を覚える先）。
	purchaseUnitMemory?: PurchaseUnitMemory;
	// すでにある同じ食材の、ロットの換算（新しい順）。候補になる。
	lookupLotPurchaseUnits?: (
		ingredientName: string,
	) => readonly InventoryLotPurchaseUnit[];
};

function readInventoryItemId(result: unknown): string | null {
	if (typeof result !== "object" || result === null) {
		return null;
	}

	const inventoryItem = (result as { inventoryItem?: unknown }).inventoryItem;

	if (typeof inventoryItem !== "object" || inventoryItem === null) {
		return null;
	}

	const id = (inventoryItem as { inventoryItemId?: unknown }).inventoryItemId;

	return typeof id === "string" ? id : null;
}

// 在庫への直接登録の状態と操作。登録のパネルを閉じても入力が残るよう、パネルの外（開く側）で持つ。
// 買い物メモを経由せず、塩・醤油のように、買った記録のない食材も登録できる。
export function useInventoryRegistration({
	registerInventoryItem,
	onRegistered,
	expiryEstimateLevel = "reliable",
	lookupIngredientDefaults,
	purchaseUnitMemory,
	lookupLotPurchaseUnits,
}: UseInventoryRegistrationOptions) {
	const [ingredientName, setIngredientName] = useState("");
	// 在庫の単位の選択（"g:g" の形。マスタにない食材は、"custom"＝自分で入力した呼び名の個数）。
	const [unitChoice, setUnitChoice] = useState("g:g");
	const [customUnitLabel, setCustomUnitLabel] = useState("");
	const [trackingMode, setTrackingMode] =
		useState<InventoryTrackingMode>("estimated");
	const [initialQuantity, setInitialQuantity] = useState("");
	// 個数の食材の、「1個＝110g」の換算（量が空なら、なし）。呼び名は、在庫の単位。
	const [purchaseUnitDraft, setPurchaseUnitDraft] = useState<PurchaseUnitDraft>(
		() => emptyPurchaseUnitDraft("個"),
	);
	const [expiry, setExpiry] = useState<ExpiryFieldsValue>(emptyExpiryFields);
	// ユーザーが期限の欄を触ったら、食材名を変えても、目安で上書きしない。
	const [isExpiryTouched, setIsExpiryTouched] = useState(false);
	const [presets, setPresets] = useState<readonly IngredientPurchasePreset[]>(
		[],
	);
	// クイック入力の基準になる、今日（日本時間）。
	const today = useMemo(() => toDateString(new Date()), []);
	const submitAction = useButtonAction();
	const isSubmitting = submitAction.isPending;
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// 開いている間に追加したもの（「卵 6個」「塩」。連続して登録していることの手応え）。
	const [added, setAdded] = useState<readonly string[]>([]);

	// 食材名・目安の設定が変わったとき、期限の欄（触っていなければ）に、目安を入れ直す。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 食材名と設定が変わったときだけ、入れ直す。
	useEffect(() => {
		if (isExpiryTouched) {
			return;
		}

		setExpiry(
			ingredientName.trim() === ""
				? emptyExpiryFields
				: buildExpiryPrefill({
						ingredientName,
						acquiredOn: today,
						level: expiryEstimateLevel,
						learnedRemainingDays: getLearnedRemainingDays(ingredientName),
						userDefaults: lookupIngredientDefaults?.(ingredientName) ?? null,
					}),
		);
	}, [ingredientName, expiryEstimateLevel, lookupIngredientDefaults, today]);

	function changeName(value: string) {
		setIngredientName(value);

		// カタログにある食材なら、在庫の単位と管理方法の初期値を入れる（あとから変更できる）。
		const entry = findIngredientCatalogEntry(value);

		const nextOptions = listStockUnitOptions(value);

		if (entry) {
			setUnitChoice(
				toUnitValue({
					stockUnitCode: entry.stockUnitCode,
					stockUnitLabel: getDefaultStockUnitLabel(entry.stockUnitCode),
				}),
			);
			setTrackingMode(entry.defaultTrackingMode);
		} else if (
			unitChoice !== customUnitValue &&
			!nextOptions.some((option) => toUnitValue(option) === unitChoice)
		) {
			setUnitChoice(
				toUnitValue(
					nextOptions[0] ?? { stockUnitCode: "g", stockUnitLabel: "g" },
				),
			);
		}

		// カタログにある食材の、買うときの数量（数量ボタン）。
		setPresets(entry?.presets ?? []);
	}

	function changeTrackingMode(value: string) {
		setTrackingMode(v.parse(inventoryTrackingModeSchema, value));
	}

	function changeExpiry(value: ExpiryFieldsValue) {
		setExpiry(value);
		setIsExpiryTouched(true);
	}

	// マスタにある単位だけを、選べる。マスタにない食材は、自分で呼び名を入力することもできる。
	const isInCatalog = findIngredientCatalogEntry(ingredientName) !== undefined;
	const unitOptions = listStockUnitOptions(ingredientName);
	const stockUnit: StockUnitOption =
		unitChoice === customUnitValue
			? {
					stockUnitCode: "count",
					stockUnitLabel: customUnitLabel.trim() || "個",
				}
			: (unitOptions.find((option) => toUnitValue(option) === unitChoice) ??
				unitOptions[0] ?? { stockUnitCode: "g", stockUnitLabel: "g" });

	// 換算を決められるのは、在庫の単位が個数のとき（1個が何gか）。呼び名は、在庫の単位に固定。
	const canSetPurchaseUnit = stockUnit.stockUnitCode === "count";
	const fixedPurchaseUnitDraft: PurchaseUnitDraft = {
		...purchaseUnitDraft,
		label: stockUnit.stockUnitLabel,
	};
	const purchaseUnitCandidates = canSetPurchaseUnit
		? collectPurchaseUnitCandidates([
				...(lookupLotPurchaseUnits?.(ingredientName) ?? []),
				...(purchaseUnitMemory?.candidates(ingredientName) ?? []),
			]).filter((unit) => unit.label === stockUnit.stockUnitLabel)
		: [];

	// markAsAvailable が true のときは、数量を入れず、「ある」（有無だけ）で登録する（塩・醤油など）。
	async function submit(markAsAvailable: boolean) {
		if (isSubmitting) {
			return false;
		}

		setErrorMessage(null);

		if (ingredientName.trim() === "") {
			setErrorMessage("食材名を入力してください");

			return false;
		}

		// 数量が、数として読めないとき（負の数、文字など）は、送らない。
		if (
			!markAsAvailable &&
			initialQuantity.trim() !== "" &&
			parseQuantityInput(initialQuantity) === null
		) {
			setErrorMessage("数量を確認してください（例：2、0.5、1/2）");

			return false;
		}

		let input: RegisterInventoryItemInput;
		let purchaseUnit: InventoryLotPurchaseUnit | null = null;

		try {
			purchaseUnit =
				markAsAvailable || !canSetPurchaseUnit
					? null
					: parsePurchaseUnitDraft(fixedPurchaseUnitDraft);
			input = parseRegisterInventoryItemInput({
				transactionId: crypto.randomUUID(),
				ingredientName,
				stockUnitCode: stockUnit.stockUnitCode,
				stockUnitLabel: stockUnit.stockUnitLabel,
				trackingMode,
				// 空欄は、数量なしで食材だけを登録する。
				initialQuantity:
					markAsAvailable || initialQuantity.trim() === ""
						? 0
						: (parseQuantityInput(initialQuantity) ?? Number.NaN),
				markAsAvailable,
				lot: {
					...toLotInput(expiry),
					...(purchaseUnit ? { purchaseUnit } : {}),
				},
			});
		} catch (error) {
			setErrorMessage(describeError(error, "入力内容を確認してください"));

			return false;
		}

		try {
			const result = await registerInventoryItem(input);

			setAdded((current) => [
				...current,
				markAsAvailable || input.initialQuantity === 0
					? input.ingredientName
					: `${input.ingredientName} ${formatQuantityForUnit(input.initialQuantity, input.stockUnitLabel)}${input.stockUnitLabel}`,
			]);
			// 食材名・数量・期限は空に戻す。管理方法と、期限の自動入力の設定は、そのまま（続けて登録しやすいように）。
			setIngredientName("");
			setInitialQuantity("");
			setPurchaseUnitDraft(emptyPurchaseUnitDraft("個"));
			// 決めた換算は、買い物メモの候補にもなるよう、覚える。
			if (purchaseUnit) {
				void purchaseUnitMemory?.remember(
					input.ingredientName,
					purchaseUnit,
					input.trackingMode,
				);
			}
			// 入力した期限（目安ではないもの）は、次の目安のために、覚える。
			if (expiry.expirySource === "entered" && expiry.expiresOn !== "") {
				recordExpiryHint({
					ingredientName: input.ingredientName,
					acquiredOn: today,
					expiresOn: expiry.expiresOn,
					storage: expiry.storage === "" ? null : expiry.storage,
				});
			}

			setExpiry(emptyExpiryFields);
			setIsExpiryTouched(false);
			setPresets([]);
			onRegistered({ inventoryItemId: readInventoryItemId(result) });

			return true;
		} catch {
			setErrorMessage("在庫に追加できませんでした。通信を確認してください");

			return false;
		}
	}

	// 管理方法が「有無だけ」なら、数量はなく、「ある」で登録する。
	function submitCurrent() {
		void submitAction.run(() => submit(trackingMode === "presence"));
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		submitCurrent();
	}

	// 閉じたら、追加したものの一覧と、失敗の文を消す（入力は残す）。
	function resetSession() {
		setAdded([]);
		setErrorMessage(null);
	}

	return {
		ingredientName,
		changeName,
		unitChoice,
		setUnitChoice,
		customUnitLabel,
		setCustomUnitLabel,
		unitOptions,
		stockUnit,
		isInCatalog,
		trackingMode,
		changeTrackingMode,
		initialQuantity,
		setInitialQuantity,
		canSetPurchaseUnit,
		purchaseUnitDraft: fixedPurchaseUnitDraft,
		setPurchaseUnitDraft,
		purchaseUnitCandidates,
		presets,
		expiry,
		changeExpiry,
		today,
		isSubmitting,
		submitAction,
		errorMessage,
		added,
		submit,
		submitCurrent,
		handleSubmit,
		resetSession,
	};
}

export type InventoryRegistration = ReturnType<typeof useInventoryRegistration>;
