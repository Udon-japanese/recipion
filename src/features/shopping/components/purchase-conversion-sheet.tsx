import { Button } from "#/components/button/button";
import { Modal } from "#/components/dialog/modal";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import type { AmountDraft } from "../domain/amount-draft";
import type { ShoppingItem } from "../domain/shopping-item";
import * as styles from "./purchase-conversion-sheet.css";
import { PurchaseRowQuantity } from "./purchase-row-quantity";

type PurchaseConversionSheetProps = {
	// 在庫換算が足りない、チェック済みの商品。
	items: readonly ShoppingItem[];
	drafts: Record<string, AmountDraft>;
	errors: Record<string, string>;
	onChangeDraft: (itemId: string, draft: AmountDraft) => void;
	isConfirming: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

// 購入確定の前に、「買ったものが、在庫でいくつになるか」を聞く（換算が足りない商品だけ）。
// 期限・保存方法は、ここでは聞かない（自動の目安が入る。直すのは、在庫の画面）。
export function PurchaseConversionSheet({
	items,
	drafts,
	errors,
	onChangeDraft,
	isConfirming,
	onConfirm,
	onCancel,
}: PurchaseConversionSheetProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");

	const footer = (
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
				{isConfirming ? "購入確定中…" : "購入確定"}
			</Button>
		</div>
	);

	const body = (
		<div className={styles.container}>
			<p className={styles.hint}>
				買ったものが、在庫でいくつになるかを、教えてください。パッケージの内容量を見て、数と単位を入れてください。
			</p>

			<ul className={styles.list}>
				{items.map((item) => {
					const draft = drafts[item.id];

					return (
						<li className={styles.item} key={item.id}>
							<div className={styles.itemHead}>
								<h3 className={styles.itemName}>{item.name}</h3>
								<span className={styles.bought}>
									買った数 {draft?.preset?.quantity ?? item.quantity}
									{(draft?.preset?.unitLabel ?? item.unitLabel)?.trim() ?? ""}
								</span>
							</div>

							<PurchaseRowQuantity
								item={item}
								draft={draft}
								onChange={(next) => onChangeDraft(item.id, next)}
								error={errors[item.id]}
								disabled={isConfirming}
							/>
						</li>
					);
				})}
			</ul>
		</div>
	);

	const title = "在庫に入れる量を教えてください";

	if (isRight) {
		return (
			<Modal
				narrow
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
