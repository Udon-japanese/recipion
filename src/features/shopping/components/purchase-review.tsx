import { Button } from "#/components/button/button";
import { Modal } from "#/components/dialog/modal";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import { ExpiryEstimateSettingRow } from "#/features/inventory/components/expiry-estimate-setting";
import {
	type ExpiryFieldsValue,
	emptyExpiryFields,
} from "#/features/inventory/components/expiry-fields";
import type { ExpiryEstimateLevel } from "#/features/inventory/domain/estimate-lot-expiry";
import {
	type ConversionDraft,
	isConversionDraftReady,
} from "../domain/conversion-draft";
import type { ShoppingItem } from "../domain/shopping-item";
import * as styles from "./purchase-review.css";
import { PurchaseExpiryCell, PurchaseStorageCell } from "./purchase-row-expiry";
import { PurchaseRowQuantity } from "./purchase-row-quantity";

type PurchaseReviewProps = {
	// 在庫に入る、チェック済みの商品（日用品は、含めない）。
	items: readonly ShoppingItem[];
	values: Record<string, ExpiryFieldsValue>;
	onChangeValue: (itemId: string, value: ExpiryFieldsValue) => void;
	// 在庫換算が足りない商品の、入力途中の換算（キーがある商品だけ、量の入力を出す）。
	conversionDrafts: Record<string, ConversionDraft>;
	conversionErrors: Record<string, string>;
	onChangeConversionDraft: (itemId: string, draft: ConversionDraft) => void;
	today: string;
	estimateLevel: ExpiryEstimateLevel;
	onChangeEstimateLevel: (level: ExpiryEstimateLevel) => void;
	isConfirming: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

// 購入確定の前の確認。量を教えてほしい商品を上に、そのまま確定できる商品を下に並べる。
// PC は中央のダイアログ（商品・量・期限・しまう場所の表）、スマホは下のシート（商品ごとのカード）。
export function PurchaseReview({
	items,
	values,
	onChangeValue,
	conversionDrafts,
	conversionErrors,
	onChangeConversionDraft,
	today,
	estimateLevel,
	onChangeEstimateLevel,
	isConfirming,
	onConfirm,
	onCancel,
}: PurchaseReviewProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");
	const layout = isRight ? "table" : "card";

	const asking = items.filter((item) => item.id in conversionDrafts);
	const ready = items.filter((item) => !(item.id in conversionDrafts));
	const pendingCount = asking.filter((item) => {
		const draft = conversionDrafts[item.id];

		return draft ? !isConversionDraftReady(item, draft) : false;
	}).length;
	const hasError = Object.keys(conversionErrors).length > 0;

	function renderRow(item: ShoppingItem) {
		const value = values[item.id] ?? emptyExpiryFields;
		const draft = conversionDrafts[item.id];
		const change = (next: ExpiryFieldsValue) => onChangeValue(item.id, next);

		return (
			<li className={styles.row} data-layout={layout} key={item.id}>
				<div className={styles.name}>
					<h3 className={styles.itemName}>{item.name}</h3>
					<span className={styles.bought}>
						買った数 {item.quantity}
						{item.unitLabel?.trim() ?? ""}
					</span>
				</div>

				<div className={styles.cell} data-label="在庫に入れる量" data-wide>
					<PurchaseRowQuantity
						item={item}
						draft={draft}
						onChange={(next) => onChangeConversionDraft(item.id, next)}
						error={conversionErrors[item.id]}
						disabled={isConfirming}
					/>
				</div>

				<div className={styles.cell} data-label="期限">
					<PurchaseExpiryCell
						name={item.name}
						value={value}
						onChange={change}
						today={today}
						disabled={isConfirming}
					/>
				</div>

				<div className={styles.cell} data-label="しまう場所">
					<PurchaseStorageCell
						name={item.name}
						value={value}
						onChange={change}
						disabled={isConfirming}
					/>
				</div>
			</li>
		);
	}

	const footer = (
		<div className={styles.footer}>
			{pendingCount > 0 ? (
				<span className={styles.footNote} data-error={hasError || undefined}>
					量を教えてほしい商品が、あと{pendingCount}件あります
				</span>
			) : null}

			<div className={styles.actions}>
				<Button
					variant="secondary"
					size="lg"
					disabled={isConfirming}
					onClick={onCancel}
				>
					キャンセル
				</Button>

				<Button size="lg" disabled={isConfirming} onClick={onConfirm}>
					{isConfirming ? "購入確定中…" : `購入確定（${items.length}件）`}
				</Button>
			</div>
		</div>
	);

	const body = (
		<div className={styles.container}>
			<p className={styles.hint}>
				このままでよければ、「購入確定」を押してください。直したいところだけ、下で直せます。
			</p>

			<div className={styles.settingLine}>
				<ExpiryEstimateSettingRow
					level={estimateLevel}
					onChange={onChangeEstimateLevel}
					quiet
				/>
			</div>

			{isRight ? (
				<div className={styles.tableHead} aria-hidden>
					<span>商品</span>
					<span>在庫に入れる量</span>
					<span>期限</span>
					<span>しまう場所</span>
				</div>
			) : null}

			{asking.length > 0 ? (
				<section className={styles.group}>
					<h3 className={styles.groupTitle}>
						量を教えてください<span>{asking.length}件</span>
					</h3>
					<p className={styles.groupNote}>
						パッケージの内容量を見て、入れてください。
					</p>
					<ul className={styles.list} data-ask>
						{asking.map(renderRow)}
					</ul>
				</section>
			) : null}

			{ready.length > 0 ? (
				<section className={styles.group}>
					{asking.length > 0 ? (
						<h3 className={styles.groupTitle}>
							このまま確定できます<span>{ready.length}件</span>
						</h3>
					) : null}
					<ul className={styles.list}>{ready.map(renderRow)}</ul>
				</section>
			) : null}
		</div>
	);

	const title = "在庫に入れる内容の確認";

	if (isRight) {
		return (
			<Modal
				open
				onOpenChange={(open) => {
					if (!open && !isConfirming) {
						onCancel();
					}
				}}
				title={title}
				footer={footer}
			>
				{body}
			</Modal>
		);
	}

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open && !isConfirming) {
					onCancel();
				}
			}}
			title={title}
			placement="bottom"
			dismissible={!isConfirming}
			footer={footer}
		>
			{body}
		</Sheet>
	);
}
