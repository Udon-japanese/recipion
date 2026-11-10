import { Icon } from "#/components/icon/icon";
import type { RegisterInventoryItemInput } from "../../application/register-inventory-item";
import type { IngredientExpiryDefaults } from "../../domain/build-expiry-prefill";
import type { ExpiryEstimateLevel } from "../../domain/estimate-lot-expiry";
import type { InventoryLotPurchaseUnit } from "../../domain/inventory-lot";
import type { PurchaseUnitMemory } from "../../hooks/use-purchase-unit-memory";
import { InventoryRegistrationPanel } from "./registration-panel";
import * as styles from "./registration-panel.css";
import {
	type RegisteredInfo,
	useInventoryRegistration,
} from "./use-inventory-registration";

// 在庫の画面へ渡す、登録まわりの部品と設定。
export type InventoryRegistrationConfig = {
	registerInventoryItem: (
		input: RegisterInventoryItemInput,
	) => Promise<unknown>;
	// 期限の目安の自動入力（設定の画面で変える）。
	expiryEstimateLevel: ExpiryEstimateLevel;
	lookupIngredientDefaults?: (
		ingredientName: string,
	) => IngredientExpiryDefaults | null;
};

type InventoryRegistrationControllerProps = {
	config: InventoryRegistrationConfig;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onRegistered: (info: RegisteredInfo) => void;
	// スマホの右下の「在庫に追加」を出すか（空のときは、画面の中のボタンに一本化する）。
	showFab: boolean;
	// おうちの絵の下の床に置くとき：場面の角から離す（場面の枠に、くっつかないように）。
	fabOnScene?: boolean;
	// 換算の候補と、決めた換算を覚える先（買い物メモの記憶）。
	purchaseUnitMemory?: PurchaseUnitMemory;
	// すでにある同じ食材の、ロットの換算（新しい順）。
	lookupLotPurchaseUnits?: (
		ingredientName: string,
	) => readonly InventoryLotPurchaseUnit[];
};

// 登録のパネル・右下の「在庫に追加」。入力の状態は、ここで持つ（パネルを閉じても残る）。
export function InventoryRegistrationController({
	config,
	isOpen,
	onOpenChange,
	onRegistered,
	showFab,
	fabOnScene = false,
	purchaseUnitMemory,
	lookupLotPurchaseUnits,
}: InventoryRegistrationControllerProps) {
	const registration = useInventoryRegistration({
		registerInventoryItem: config.registerInventoryItem,
		onRegistered,
		expiryEstimateLevel: config.expiryEstimateLevel,
		lookupIngredientDefaults: config.lookupIngredientDefaults,
		purchaseUnitMemory,
		lookupLotPurchaseUnits,
	});

	return (
		<>
			{showFab ? (
				<button
					className={styles.fab}
					data-on-scene={fabOnScene || undefined}
					type="button"
					aria-label="在庫に追加"
					aria-haspopup="dialog"
					onClick={() => onOpenChange(true)}
				>
					<Icon name="plus" size={24} />
				</button>
			) : null}

			<InventoryRegistrationPanel
				open={isOpen}
				onOpenChange={onOpenChange}
				registration={registration}
			/>
		</>
	);
}
