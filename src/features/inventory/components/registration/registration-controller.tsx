import { Icon } from "#/components/icon/icon";
import type { RegisterInventoryItemInput } from "../../application/register-inventory-item";
import type { IngredientExpiryDefaults } from "../../domain/build-expiry-prefill";
import type { ExpiryEstimateLevel } from "../../domain/estimate-lot-expiry";
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
	expiryEstimateLevel: ExpiryEstimateLevel;
	onExpiryEstimateLevelChange: (level: ExpiryEstimateLevel) => void;
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
};

// 登録のパネル・右下の「在庫に追加」。入力の状態は、ここで持つ（パネルを閉じても残る）。
export function InventoryRegistrationController({
	config,
	isOpen,
	onOpenChange,
	onRegistered,
	showFab,
}: InventoryRegistrationControllerProps) {
	const registration = useInventoryRegistration({
		registerInventoryItem: config.registerInventoryItem,
		onRegistered,
		expiryEstimateLevel: config.expiryEstimateLevel,
		lookupIngredientDefaults: config.lookupIngredientDefaults,
	});

	return (
		<>
			{showFab ? (
				<button
					className={styles.fab}
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
				expiryEstimate={{
					level: config.expiryEstimateLevel,
					onChange: config.onExpiryEstimateLevelChange,
				}}
			/>
		</>
	);
}
