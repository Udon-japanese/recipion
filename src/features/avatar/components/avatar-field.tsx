import { useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Modal } from "#/components/dialog/modal";
import { Icon } from "#/components/icon/icon";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import {
	DishCoverEditor,
	type DishEditorPreset,
} from "#/features/dish-art/components/dish-cover-editor";
import * as editorStyles from "#/features/dish-art/components/dish-cover-editor.css";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import {
	type Avatar,
	type AvatarBackground,
	avatarBackgrounds,
	avatarLimits,
} from "../domain/avatar";
import { avatarPresets, defaultAvatarFor } from "../domain/avatar-presets";
import * as styles from "./avatar-field.css";
import { UserAvatar } from "./user-avatar";

type AvatarFieldProps = {
	userId: string;
	// null は、まだ作っていない（ユーザーごとに決まったプリセット）。
	avatar: Avatar | null;
	// 保存する。成功したら true。
	onSave: (avatar: Avatar) => Promise<boolean>;
};

const editorPresets: readonly DishEditorPreset[] = avatarPresets.map(
	(preset) => ({ ...preset, background: avatarBackgrounds[preset.background] }),
);

const backgroundIds = Object.keys(avatarBackgrounds) as AvatarBackground[];

// プロフィールのアバター。絵を押すと、料理の絵と同じエディタで組み立てる（PC・中画面は広いダイアログ、スマホはシート）。
// 「決定」で保存する。「キャンセル」と閉じる操作は、組み立てる前のままにする。
export function AvatarField({ userId, avatar, onSave }: AvatarFieldProps) {
	const current = avatar ?? defaultAvatarFor(userId);
	const [open, setOpen] = useState(false);
	const [placements, setPlacements] = useState<DishPlacement[]>([]);
	const [background, setBackground] = useState<AvatarBackground>("yolk");
	const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isWide = useMediaQuery("(min-width: 768px)");
	const isDirty =
		background !== current.background ||
		JSON.stringify(placements) !== JSON.stringify(current.placements);

	function openEditor() {
		setPlacements([...current.placements]);
		setBackground(current.background);
		setErrorMessage(null);
		setOpen(true);
	}

	// 閉じる操作（×・Esc・暗幕・つかんで下げる）。組み立てた内容があれば、捨てるかを確かめる。
	function requestClose() {
		if (isSaving) return;

		if (isDirty) {
			setIsConfirmingDiscard(true);

			return;
		}

		setOpen(false);
	}

	async function save() {
		if (placements.length === 0) {
			setErrorMessage("部品を1つ以上置いてください");

			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const isSaved = await onSave({ background, placements });

			if (isSaved) {
				setOpen(false);
			} else {
				setErrorMessage(
					"保存できませんでした。時間をおいてもう一度お試しください。",
				);
			}
		} finally {
			setIsSaving(false);
		}
	}

	const editor = (
		<DishCoverEditor
			placements={placements}
			onChange={setPlacements}
			maxParts={avatarLimits.maxParts}
			presets={editorPresets}
			onChoosePreset={(preset) => {
				const chosen = avatarPresets.find(
					(candidate) => candidate.id === preset.id,
				);

				if (chosen) setBackground(chosen.background);
			}}
			background={avatarBackgrounds[background]}
			round
			initialCategoryId="face"
			label="アバター。"
			extra={
				<>
					<div className={editorStyles.swatchGroup}>
						<h3 className={editorStyles.groupTitle}>背景</h3>
						<div className={editorStyles.swatches}>
							{backgroundIds.map((id) => (
								<button
									key={id}
									type="button"
									className={editorStyles.swatch}
									style={{ background: avatarBackgrounds[id] }}
									aria-label={`背景 ${avatarBackgrounds[id]}`}
									aria-pressed={background === id}
									onClick={() => setBackground(id)}
								/>
							))}
						</div>
					</div>
					{errorMessage ? (
						<p className={styles.error} role="alert">
							<Icon name="alert-triangle" size={20} />
							{errorMessage}
						</p>
					) : null}
				</>
			}
		/>
	);
	const footer = (
		<>
			<Button
				type="button"
				variant="secondary"
				disabled={isSaving}
				onClick={requestClose}
			>
				キャンセル
			</Button>
			<Button
				type="button"
				status={isSaving ? "pending" : "idle"}
				pendingLabel="保存中"
				onClick={() => void save()}
			>
				決定
			</Button>
		</>
	);

	return (
		<>
			<button
				type="button"
				className={styles.entry}
				aria-label="アバターを編集"
				onClick={openEditor}
			>
				<UserAvatar userId={userId} avatar={avatar} size={96} />
				<span className={styles.entryBadge} aria-hidden="true">
					<Icon name="edit" size={16} />
				</span>
			</button>

			{isWide ? (
				<Modal
					open={open}
					onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
					title="アバター"
					footer={footer}
				>
					{editor}
				</Modal>
			) : (
				<Sheet
					open={open}
					onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
					title="アバター"
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
