import { Button } from "#/components/button/button";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import { ExpiryEstimateSettingRow } from "#/features/inventory/components/expiry-estimate-setting";
import {
	ExpiryFields,
	type ExpiryFieldsValue,
	emptyExpiryFields,
} from "#/features/inventory/components/expiry-fields";
import type { ExpiryEstimateLevel } from "#/features/inventory/domain/estimate-lot-expiry";
import type { ShoppingItem } from "../domain/shopping-item";
import * as styles from "./purchase-expiry-review.css";

type PurchaseExpiryReviewProps = {
	// 在庫に入る、チェック済みの商品（日用品は、含めない）。
	items: readonly ShoppingItem[];
	values: Record<string, ExpiryFieldsValue>;
	onChangeValue: (itemId: string, value: ExpiryFieldsValue) => void;
	today: string;
	estimateLevel: ExpiryEstimateLevel;
	onChangeEstimateLevel: (level: ExpiryEstimateLevel) => void;
	isConfirming: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

// 購入確定の前に、買った食材の、期限と保存方法を、まとめて入れる（すべて任意。入れずに、そのまま確定できる）。
export function PurchaseExpiryReview({
	items,
	values,
	onChangeValue,
	today,
	estimateLevel,
	onChangeEstimateLevel,
	isConfirming,
	onConfirm,
	onCancel,
}: PurchaseExpiryReviewProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open && !isConfirming) {
					onCancel();
				}
			}}
			title="期限を確認"
			placement={isRight ? "right" : "bottom"}
			dismissible={!isConfirming}
			footer={
				<div className={styles.actions}>
					<Button
						variant="secondary"
						size="lg"
						fullWidth
						disabled={isConfirming}
						onClick={onCancel}
					>
						キャンセル
					</Button>

					<Button
						size="lg"
						fullWidth
						disabled={isConfirming}
						onClick={onConfirm}
					>
						{isConfirming ? "購入確定中…" : "購入確定"}
					</Button>
				</div>
			}
		>
			<div className={styles.container}>
				<p className={styles.hint}>
					入力は、任意です。入れなくても、そのまま購入確定できます（あとから、在庫の画面で入れられます）。
				</p>

				<ExpiryEstimateSettingRow
					level={estimateLevel}
					onChange={onChangeEstimateLevel}
				/>

				<ul className={styles.list}>
					{items.map((item) => (
						<li className={styles.item} key={item.id}>
							<h3 className={styles.itemName}>{item.name}</h3>

							<ExpiryFields
								value={values[item.id] ?? emptyExpiryFields}
								onChange={(value) => onChangeValue(item.id, value)}
								today={today}
								disabled={isConfirming}
							/>
						</li>
					))}
				</ul>
			</div>
		</Sheet>
	);
}
