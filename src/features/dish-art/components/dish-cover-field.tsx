import { useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Modal } from "#/components/dialog/modal";
import { Icon } from "#/components/icon/icon";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import type { DishPlacement } from "../domain/dish-cover";
import { DishCoverEditor } from "./dish-cover-editor";
import * as styles from "./dish-cover-editor.css";
import { DishCoverView } from "./dish-cover-view";

type DishCoverFieldProps = {
	// 絵を付けていないときの、れしぽよの絵を決める種。
	seed: string;
	// null は、絵を付けていない（れしぽよの絵を出す）。
	cover: DishPlacement[] | null;
	onChange: (cover: DishPlacement[] | null) => void;
};

// レシピの編集画面の「料理の絵」。絵だけを見せ、押すと組み立てる画面が開く（PC・中画面は広いダイアログ、スマホはシート）。
// 組み立てた内容は、「決定」で、レシピに反映する。「キャンセル」と閉じる操作は、組み立てる前のままにする。
export function DishCoverField({ seed, cover, onChange }: DishCoverFieldProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DishPlacement[]>([]);
	const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
	const isWide = useMediaQuery("(min-width: 768px)");
	const isDirty = JSON.stringify(draft) !== JSON.stringify(cover ?? []);

	function openEditor() {
		setDraft(cover ? [...cover] : []);
		setOpen(true);
	}

	// 閉じる操作（×・Esc・暗幕・つかんで下げる）。組み立てた内容があれば、捨てるかを確かめる。
	function requestClose() {
		if (isDirty) {
			setIsConfirmingDiscard(true);

			return;
		}

		setOpen(false);
	}

	function save() {
		onChange(draft.length > 0 ? draft : null);
		setOpen(false);
	}

	const editor = <DishCoverEditor placements={draft} onChange={setDraft} />;
	const footer = (
		<>
			<Button type="button" variant="secondary" onClick={requestClose}>
				キャンセル
			</Button>
			<Button type="button" onClick={save}>
				決定
			</Button>
		</>
	);

	return (
		<>
			<button
				type="button"
				className={styles.entry}
				aria-label="料理の絵を編集"
				onClick={openEditor}
			>
				<span className={styles.entryArt}>
					<DishCoverView cover={cover} seed={seed} size={102} />
				</span>
				<span className={styles.entryBadge} aria-hidden="true">
					<Icon name="edit" size={16} />
				</span>
			</button>

			{isWide ? (
				<Modal
					open={open}
					onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
					title="料理の絵"
					footer={footer}
				>
					{editor}
				</Modal>
			) : (
				<Sheet
					open={open}
					onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
					title="料理の絵"
					footer={<div className={styles.sheetFooter}>{footer}</div>}
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
