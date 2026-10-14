import { useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { Field } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import type { ShoppingItem } from "../domain/shopping-item";
import * as styles from "./shopping-page.css";

type ShoppingQuantitySheetProps = {
	// 数量を直す項目（null で閉じる）。
	item: ShoppingItem | null;
	// 保存する。成功したら true。
	onSave: (item: ShoppingItem, quantity: number) => Promise<boolean>;
	onClose: () => void;
};

// 数量のチップを押したときの、数量だけを直すシート。
export function ShoppingQuantitySheet({
	item,
	onSave,
	onClose,
}: ShoppingQuantitySheetProps) {
	const isRight = useMediaQuery("(min-width: 1024px)");
	// 閉じる動きのあいだも、中身が消えないよう、最後の項目を覚えておく。
	const lastItem = useRef<ShoppingItem | null>(null);

	if (item) {
		lastItem.current = item;
	}

	const shown = item ?? lastItem.current;

	return (
		<Sheet
			open={item !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			title={shown ? `${shown.name}の数量` : "数量"}
			placement={isRight ? "right" : "bottom"}
			snapPoints={[0.62]}
		>
			{shown ? (
				<QuantityForm
					key={shown.id}
					item={shown}
					onSave={onSave}
					onClose={onClose}
				/>
			) : null}
		</Sheet>
	);
}

function QuantityForm({
	item,
	onSave,
	onClose,
}: {
	item: ShoppingItem;
	onSave: (item: ShoppingItem, quantity: number) => Promise<boolean>;
	onClose: () => void;
}) {
	const [quantity, setQuantity] = useState(
		formatQuantity(item.quantity, { grouping: false }),
	);
	const [isSaving, setIsSaving] = useState(false);

	async function handleSubmit() {
		setIsSaving(true);

		try {
			if (await onSave(item, parseQuantityInput(quantity) ?? Number.NaN)) {
				onClose();
			}
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<form
			className={styles.sheetBody}
			onSubmit={(event) => {
				event.preventDefault();
				void handleSubmit();
			}}
		>
			<Field label={`${item.name}の数量`}>
				{(control) => (
					<QuantityInput
						className={fieldInput}
						id={control.id}
						value={quantity}
						onChange={setQuantity}
						unitLabel={item.unitLabel}
					/>
				)}
			</Field>

			<p className={styles.sheetHint}>
				数量だけを直します。名前・単位・店は、「その他」の「編集」から。
			</p>

			<div className={styles.sheetButtons}>
				<Button variant="secondary" size="lg" fullWidth onClick={onClose}>
					キャンセル
				</Button>

				<Button size="lg" fullWidth type="submit" disabled={isSaving}>
					保存
				</Button>
			</div>
		</form>
	);
}
