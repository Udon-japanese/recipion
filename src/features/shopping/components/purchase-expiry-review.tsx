import { ExpiryEstimateSetting } from "#/features/inventory/components/expiry-estimate-setting";
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
	return (
		<section className={styles.container} aria-label="購入する食材の期限">
			<h3 className={styles.heading}>期限を確認</h3>

			<p className={styles.hint}>
				入力は、任意です。入れなくても、そのまま購入確定できます（あとから、在庫の画面で入れられます）。
			</p>

			<ExpiryEstimateSetting
				level={estimateLevel}
				onChange={onChangeEstimateLevel}
			/>

			<ul className={styles.list}>
				{items.map((item) => (
					<li className={styles.item} key={item.id}>
						<span className={styles.itemName}>{item.name}</span>

						<ExpiryFields
							idPrefix={`purchase-${item.id}`}
							value={values[item.id] ?? emptyExpiryFields}
							onChange={(value) => onChangeValue(item.id, value)}
							today={today}
							disabled={isConfirming}
						/>
					</li>
				))}
			</ul>

			<div className={styles.actions}>
				<button
					className={styles.cancelButton}
					type="button"
					disabled={isConfirming}
					onClick={onCancel}
				>
					キャンセル
				</button>

				<button
					className={styles.confirmButton}
					type="button"
					disabled={isConfirming}
					onClick={onConfirm}
				>
					{isConfirming ? "購入確定中…" : "購入確定"}
				</button>
			</div>
		</section>
	);
}
