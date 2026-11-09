import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Modal } from "#/components/dialog/modal";
import { Icon } from "#/components/icon/icon";
import { Note } from "#/components/note/note";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import { describeError } from "#/errors/user-facing-error";
import { DishArt } from "#/features/dish-art/components/dish-art";
import { DishArtEditor } from "#/features/dish-art/components/dish-art-editor";
import * as editorStyles from "#/features/dish-art/components/dish-art-editor.css";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import { resolveInventoryItemArt } from "../../domain/ingredient-art";
import * as styles from "./item-panel.css";

type ItemArtFieldProps = {
	item: InventoryListItem;
	// 通信できず、変えられないとき（押すと、理由を出す）。
	readOnly: boolean;
	onReadOnly: () => void;
	// 絵を保存する（null は、名前から決める絵に戻す）。失敗したら、例外。
	onSave: (art: DishPlacement[] | null) => Promise<void>;
};

// 食材のパネルの見出しの左の、在庫の絵。押すと、料理の絵と同じ組み立ての画面が開く（PC はダイアログ、スマホはシート）。
// 最初は、いまの絵（自分の絵か、名前から決めた絵）から始める。「決定」で保存し、「名前から決める絵に戻す」で、自分の絵をやめる。
export function ItemArtField({
	item,
	readOnly,
	onReadOnly,
	onSave,
}: ItemArtFieldProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DishPlacement[]>([]);
	const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const save = useButtonAction();
	const reset = useButtonAction();
	const isWide = useMediaQuery("(min-width: 768px)");
	const name = item.displayName ?? item.name;
	const current = resolveInventoryItemArt(item);
	// 自分の絵がないときの絵（名前から決める絵。作り置きは、元のレシピの絵）。
	const automatic = resolveInventoryItemArt({ ...item, art: null });
	const isDirty = JSON.stringify(draft) !== JSON.stringify(current);
	const isPending = save.isPending || reset.isPending;

	function openEditor() {
		if (readOnly) {
			onReadOnly();

			return;
		}

		setDraft([...current]);
		setErrorMessage(null);
		setOpen(true);
	}

	// 閉じる操作（×・Esc・暗幕・つかんで下げる）。組み立てた内容があれば、捨てるかを確かめる。
	function requestClose() {
		if (isPending) {
			return;
		}

		if (isDirty) {
			setIsConfirmingDiscard(true);

			return;
		}

		setOpen(false);
	}

	async function store(
		action: typeof save,
		art: DishPlacement[] | null,
	): Promise<void> {
		setErrorMessage(null);

		await action.run(async () => {
			try {
				await onSave(art);
				setOpen(false);

				return true;
			} catch (error) {
				setErrorMessage(describeError(error, "絵を保存できませんでした"));

				return false;
			}
		});
	}

	function decide() {
		if (!isDirty) {
			setOpen(false);

			return;
		}

		// 部品を全部どけたとき・名前から決める絵と同じときは、自分の絵を持たない。
		const isAutomatic =
			draft.length === 0 || JSON.stringify(draft) === JSON.stringify(automatic);

		void store(save, isAutomatic ? null : draft);
	}

	const editor = (
		<>
			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
			<DishArtEditor
				placements={draft}
				onChange={setDraft}
				presets={[
					{
						id: "automatic",
						label: "名前から決めた絵",
						placements: automatic,
					},
				]}
				label={`${name}の絵。`}
			/>
		</>
	);
	const footer = (
		<>
			{item.art ? (
				<Button
					type="button"
					variant="secondary"
					status={reset.status}
					disabled={isPending}
					onClick={() => void store(reset, null)}
				>
					名前から決める絵に戻す
				</Button>
			) : null}
			<Button
				type="button"
				variant="secondary"
				disabled={isPending}
				onClick={requestClose}
			>
				キャンセル
			</Button>
			<Button
				type="button"
				status={save.status}
				disabled={isPending}
				onClick={decide}
			>
				決定
			</Button>
		</>
	);

	return (
		<>
			<button
				type="button"
				className={styles.artButton}
				aria-label={`${name}の絵を変える`}
				aria-haspopup="dialog"
				onClick={openEditor}
			>
				<DishArt placements={current} size={36} />
				<span className={styles.artBadge} aria-hidden="true">
					<Icon name="edit" size={16} />
				</span>
			</button>

			{isWide ? (
				<Modal
					open={open}
					onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
					title={`${name}の絵`}
					footer={footer}
				>
					{editor}
				</Modal>
			) : (
				<Sheet
					open={open}
					onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
					title={`${name}の絵`}
					footer={<div className={editorStyles.sheetFooter}>{footer}</div>}
				>
					{editor}
				</Sheet>
			)}

			<ConfirmDialog
				open={isConfirmingDiscard}
				title="変更を破棄しますか？"
				cancelLabel="編集に戻る"
				confirmLabel="破棄する"
				danger
				onCancel={() => setIsConfirmingDiscard(false)}
				onConfirm={() => {
					setIsConfirmingDiscard(false);
					setOpen(false);
				}}
			/>
		</>
	);
}
