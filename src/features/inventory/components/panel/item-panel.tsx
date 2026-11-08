import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Card } from "#/components/card/card";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Field, SelectBox, TextInput } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import {
	clampPanelPosition,
	FloatingPanel,
	type FloatingPanelHandle,
	floatingPanelWidth,
	type PanelPosition,
} from "#/components/floating-panel/floating-panel";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { IconButton } from "#/components/icon-button/icon-button";
import { Menu, type MenuItem } from "#/components/menu/menu";
import { Note } from "#/components/note/note";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { listStockUnitOptions } from "#/features/ingredients/domain/list-stock-unit-options";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatStockAmount } from "#/features/quantity/domain/format-quantity";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import {
	expiryKindLabels,
	formatShortDate,
	storageLabels,
} from "../../domain/expiry-labels";
import {
	findNearestExpiry,
	getLotZone,
	type InventoryZoneId,
} from "../../domain/inventory-fridge";
import {
	type InventoryLot,
	sortLotsForConsumption,
} from "../../domain/inventory-lot";
import {
	trackingModeHints,
	trackingModeOptions,
} from "../tracking-mode-options";
import { AdjustControls } from "./adjust-controls";
import type { InventoryActions } from "./inventory-actions";
import * as styles from "./item-panel.css";
import { LotEditor } from "./lot-editor";
import { isCurrentUnit, toOptionValue, useItemPanel } from "./use-item-panel";

export type ItemPanelMode = "sheet-bottom" | "floating";

type ItemPanelProps = {
	// false のあいだは、閉じる動きを見せている途中（呼び出し側が useExitPresence で描いたままにする）。
	open?: boolean;
	item: InventoryListItem;
	// 開いたタイルのゾーン。そのゾーンのロットを先頭に並べる。
	zone: InventoryZoneId;
	mode: ItemPanelMode;
	actions: InventoryActions;
	// 通信できず、保存済みの在庫を見ているとき。書き換える操作は、押すと理由を出す。
	readOnly: boolean;
	// 浮いたパネルが寄り添う、一覧の行（data-tile-key）。
	anchorTileKey?: string;
	// 開く位置：overlap＝押した行の右端に、パネルの中央／beside＝行の右隣（おうちの表示）。
	anchorPlacement?: "overlap" | "beside";
	onClose: () => void;
	onUpdate: (
		inventoryItemId: string,
		update: Partial<InventoryListItem>,
	) => void;
	onDeleted: (inventoryItemId: string) => void;
};

const offlineMessage = "通信できないため、いまは変更できません。";

const storageIcons: Record<NonNullable<InventoryLot["storage"]>, IconName> = {
	fridge: "zone-fridge",
	freezer: "zone-freezer",
	room: "zone-table",
};

function formatLotExpiry(lot: InventoryLot): string | null {
	if (!lot.expiresOn) {
		return lot.expiryKind === "none" ? "期限なし" : null;
	}

	const kind =
		lot.expiryKind && lot.expiryKind !== "none"
			? expiryKindLabels[lot.expiryKind]
			: "期限";
	const approximate = lot.expirySource === "estimated" ? "約 " : "";

	return `${kind} ${approximate}${formatShortDate(lot.expiresOn)}`;
}

function formatQuantityText(item: InventoryListItem, quantity: number) {
	return `${item.trackingMode === "estimated" ? "約 " : ""}${formatStockAmount(quantity, item.stockUnitCode)}${item.stockUnitLabel}`;
}

// 食材のパネル：上から、量 → 主な操作 → ロット → ほかの操作。6つのフォームは、本体に差し替える。
export function ItemPanel({
	open = true,
	item,
	zone,
	mode,
	actions,
	readOnly,
	anchorTileKey,
	anchorPlacement = "overlap",
	onClose,
	onUpdate,
	onDeleted,
}: ItemPanelProps) {
	const panel = useItemPanel({ item, actions, onUpdate, onDeleted });
	const primary = useButtonAction();
	const decrease = useButtonAction();
	const increase = useButtonAction();
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeletePending, setIsDeletePending] = useState(false);
	const [isFlashing, setIsFlashing] = useState(false);
	// 内訳のうち、その場で直している行。
	const [editingLotId, setEditingLotId] = useState<string | null>(null);
	// PC：入れた分の編集を、本体の横に出す位置（開くときに決める）。
	const mainPanelRef = useRef<FloatingPanelHandle>(null);
	const editorPanelRef = useRef<FloatingPanelHandle>(null);
	const editorPositionRef = useRef<PanelPosition>({ x: 0, y: 0 });

	function toggleLotEditor(lotId: string) {
		if (editingLotId === lotId) {
			setEditingLotId(null);

			return;
		}

		if (mode === "floating") {
			const placement = placeBesidePanel(mainPanelId);

			editorPositionRef.current = placement.editor;

			if (placement.main) {
				mainPanelRef.current?.moveTo(placement.main);
			}
		}

		setEditingLotId(lotId);
	}
	const previousQuantity = useRef(item.quantity);

	const displayName = item.displayName ?? item.name;
	const title = item.displayName
		? `${item.displayName}（${item.name}）`
		: item.name;
	const { view } = panel;
	const isPresence = item.trackingMode === "presence";

	// 量が変わったら、短く強調する。
	useEffect(() => {
		if (previousQuantity.current === item.quantity) {
			return;
		}

		previousQuantity.current = item.quantity;
		setIsFlashing(true);

		const timer = window.setTimeout(() => setIsFlashing(false), 600);

		return () => window.clearTimeout(timer);
	}, [item.quantity]);

	// 書き換える操作：通信できないときは、実行せず、理由を出す。
	function guard(action: () => void) {
		return () => {
			if (readOnly) {
				panel.setErrorMessage(offlineMessage);

				return;
			}

			action();
		};
	}

	function runPrimary(action: () => Promise<boolean>) {
		if (readOnly) {
			panel.setErrorMessage(offlineMessage);

			return;
		}

		void primary.run(action);
	}

	// 「使った」「買い足した」：押したボタンにだけ、処理中・完了を出す。
	// どちらかの処理中は、もう一方も受け付けない（ボタンは押せなくしてあるが、ここでも弾く）。
	function runAdjust(
		operation: "decrease" | "increase",
		action: () => Promise<boolean>,
	) {
		if (decrease.isPending || increase.isPending) {
			return;
		}

		if (readOnly) {
			panel.setErrorMessage(offlineMessage);

			return;
		}

		void (operation === "decrease" ? decrease : increase).run(action);
	}

	const sortedLots = sortLotsForConsumption(item.lots).sort((a, b) => {
		const aHere = getLotZone(item, a) === zone ? 0 : 1;
		const bHere = getLotZone(item, b) === zone ? 0 : 1;

		return aHere - bHere;
	});

	const lotLabel = (lot: InventoryLot) =>
		`${formatShortDate(lot.acquiredOn)}に入れた分`;

	// ---- 本文・見出し・操作バーを、いまの画面で決める ----
	let heading = title;
	let body: ReactNode;
	let bar: ReactNode = null;

	const cancel = (
		<Button variant="secondary" fullWidth onClick={panel.goMain}>
			キャンセル
		</Button>
	);
	const status = primary.status;

	if (view.name === "unit") {
		const options = listStockUnitOptions(item.name).filter(
			(option) => !isCurrentUnit(item, option),
		);
		const selected = options.find(
			(option) => toOptionValue(option) === panel.unitForm.option,
		);

		heading = `${displayName}の新しい単位`;
		body = (
			<div className={styles.formStack}>
				<Field
					label={`${item.name}の新しい単位（いまは${item.stockUnitLabel}）`}
				>
					{(control) => (
						<SelectBox
							{...control}
							aria-label={`${item.name}の新しい単位`}
							value={panel.unitForm.option}
							onChange={(event) => panel.unitForm.choose(event.target.value)}
						>
							{options.map((option) => (
								<option
									value={toOptionValue(option)}
									key={toOptionValue(option)}
								>
									{option.stockUnitLabel}
								</option>
							))}
						</SelectBox>
					)}
				</Field>

				<div className={styles.lotFieldList}>
					<p className={styles.subLabel}>
						入れた分ごとの量（換算した目安が入っています。違えば直してください）
					</p>
					{item.lots.map((lot) => (
						<div key={lot.id} className={styles.lotFieldList}>
							<span>
								{lotLabel(lot)}
								{formatLotExpiry(lot) ? `（${formatLotExpiry(lot)}）` : ""}
							</span>
							<QuantityInput
								className={fieldInput}
								aria-label={`${lotLabel(lot)}の新しい単位での量`}
								unitLabel={selected?.stockUnitLabel}
								value={panel.unitForm.lotQuantities[lot.id] ?? ""}
								onChange={(value) =>
									panel.unitForm.setLotQuantity(lot.id, value)
								}
							/>
						</div>
					))}
				</div>
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="2">
				{cancel}
				<Button
					fullWidth
					status={status}
					disabled={panel.unitForm.option === ""}
					onClick={() => runPrimary(panel.run.changeUnit)}
				>
					この単位にする
				</Button>
			</div>
		);
	} else if (view.name === "rename") {
		heading = "在庫の一覧に出す名前";
		body = (
			<div className={styles.formStack}>
				<Field
					label="在庫の一覧に出す名前"
					hint={`${item.name}のまま、レシピとの照合に使います`}
				>
					{(control) => (
						<TextInput
							{...control}
							aria-label={`${item.name}の呼び名`}
							value={panel.renameForm.value}
							maxLength={50}
							placeholder={item.name}
							onChange={(event) =>
								panel.renameForm.setValue(event.target.value)
							}
						/>
					)}
				</Field>
				<p className={styles.counter}>{panel.renameForm.value.length} / 50</p>
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="2">
				{cancel}
				<Button
					fullWidth
					status={status}
					onClick={() => runPrimary(panel.run.rename)}
				>
					{panel.renameForm.value.trim() === ""
						? "元の名前に戻す"
						: "この名前にする"}
				</Button>
			</div>
		);
	} else if (view.name === "tracking") {
		const nextMode = panel.trackingForm.mode;
		// 数えない → 数える、のときだけ、いまの量を入れてもらう（数えない食材は、量を持っていない）。
		const asksQuantity = isPresence && nextMode !== "presence";

		heading = `${displayName}の数え方`;
		body = (
			<div className={styles.formStack}>
				<SegmentedControl
					label={`${item.name}の数え方`}
					value={nextMode}
					onChange={panel.trackingForm.setMode}
					options={trackingModeOptions}
				/>
				<p className={styles.hint}>{trackingModeHints[nextMode]}</p>

				{asksQuantity ? (
					<div className={styles.quantityLine}>
						<QuantityInput
							className={fieldInput}
							aria-label={`${item.name}のいまの量`}
							value={panel.trackingForm.quantity}
							onChange={panel.trackingForm.setQuantity}
							unitLabel={item.stockUnitLabel}
						/>
						<span className={styles.unitSuffix}>{item.stockUnitLabel}</span>
					</div>
				) : null}
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="2">
				{cancel}
				<Button
					fullWidth
					status={status}
					disabled={nextMode === item.trackingMode}
					onClick={() => runPrimary(panel.run.applyTracking)}
				>
					この数え方にする
				</Button>
			</div>
		);
	} else {
		body = (
			<div className={styles.stack}>
				<div className={styles.amountRow}>
					{isPresence ? (
						<Tag tone={item.quantity > 0 ? "success" : "default"}>
							{item.quantity > 0 ? "あり" : "なし"}
						</Tag>
					) : (
						<p className={styles.amount} data-flash={isFlashing || undefined}>
							{formatQuantityText(item, item.quantity)}
						</p>
					)}
				</div>

				{isPresence && actions.adjustInventoryItem ? (
					<Button
						fullWidth
						status={status}
						disabled={readOnly}
						disabledReason={offlineMessage}
						onClick={() =>
							runPrimary(() =>
								panel.run.togglePresence(
									item.quantity > 0 ? "decrease" : "increase",
								),
							)
						}
					>
						{item.quantity > 0 ? "なくなった" : "ある"}
					</Button>
				) : null}

				{!isPresence && actions.adjustInventoryItem ? (
					<AdjustControls
						item={item}
						label={`${item.name}の使った量・買い足した量`}
						available={item.quantity}
						quantity={panel.adjustForm.quantity}
						onQuantityChange={panel.adjustForm.setQuantity}
						readOnly={readOnly}
						onRun={(operation) =>
							runAdjust(operation, () => panel.run.adjustItem(operation))
						}
						decreaseStatus={decrease.status}
						increaseStatus={increase.status}
					/>
				) : null}

				{item.lots.length > 0 ? (
					<Card>
						<ul className={styles.lotList} aria-label={`${item.name}の内訳`}>
							{sortedLots.map((lot) => {
								const expiryText = formatLotExpiry(lot);
								const badge = findNearestExpiry([lot], panel.today);
								const canEdit = Boolean(
									actions.adjustInventoryItem || actions.updateInventoryLot,
								);
								const isEditing = editingLotId === lot.id;
								const summary = (
									<>
										<span className={styles.lotLine}>
											<span className={styles.lotName}>{lotLabel(lot)}</span>
											{lot.storage ? (
												<Tag icon={storageIcons[lot.storage]}>
													{storageLabels[lot.storage]}
												</Tag>
											) : null}
											{isPresence ? null : (
												<span className={styles.lotAmount}>
													{formatQuantityText(item, lot.quantity)}
												</span>
											)}
										</span>
										{expiryText || badge ? (
											<span className={styles.lotLine}>
												{expiryText ? <span>{expiryText}</span> : null}
												{badge ? (
													<Tag
														tone={badge.level === "expired" ? "error" : "warn"}
														icon={
															badge.level === "expired"
																? "alert-triangle"
																: "clock"
														}
														note={badge.approximate ? "目安" : undefined}
													>
														{badge.badgeText}
													</Tag>
												) : null}
											</span>
										) : null}
									</>
								);

								return (
									<li className={styles.lot} key={lot.id}>
										{canEdit ? (
											<button
												type="button"
												className={styles.lotButton}
												aria-label={`${lotLabel(lot)}を直す`}
												aria-expanded={isEditing}
												onClick={guard(() => toggleLotEditor(lot.id))}
											>
												<span className={styles.lotSummary}>{summary}</span>
												<Icon
													name={isEditing ? "chevron-down" : "chevron-right"}
													size={20}
												/>
											</button>
										) : (
											<div className={styles.lotSummary}>{summary}</div>
										)}
									</li>
								);
							})}
						</ul>
					</Card>
				) : null}
			</div>
		);
	}

	// めったに使わない操作（見出しの「…」）。
	const menuItems: MenuItem[] = [
		...(actions.renameInventoryItem
			? [
					{
						label: "名前を変更",
						icon: "edit" as const,
						onSelect: guard(panel.open.rename),
					},
				]
			: []),
		...(actions.changeStockUnit && !isPresence
			? [
					{
						label: "単位を変える",
						icon: "ruler" as const,
						onSelect: guard(panel.open.unit),
					},
				]
			: []),
		...(actions.changeTrackingMode
			? [
					{
						label: "数え方を変える",
						icon: "settings" as const,
						onSelect: guard(panel.open.tracking),
					},
				]
			: []),
		...(actions.deleteInventoryItem
			? [
					{
						label: "削除",
						icon: "trash" as const,
						tone: "danger" as const,
						onSelect: guard(() => setIsDeleting(true)),
					},
				]
			: []),
	];
	const menu =
		view.name === "main" && menuItems.length > 0 ? (
			<Menu
				label={`${displayName}のその他`}
				icon="more-horizontal"
				items={menuItems}
			/>
		) : null;

	const errorNote = panel.errorMessage ? (
		<div className={styles.formStack}>
			<Note tone="error">{panel.errorMessage}</Note>
		</div>
	) : null;

	const content = (
		<>
			{editingLotId ? null : errorNote}
			{body}
			<ConfirmDialog
				open={isDeleting}
				title="在庫から削除しますか"
				cancelLabel="やめる"
				confirmLabel="削除する"
				danger
				pending={isDeletePending}
				onCancel={() => setIsDeleting(false)}
				onConfirm={async () => {
					setIsDeletePending(true);
					const done = await panel.run.remove();
					setIsDeletePending(false);
					setIsDeleting(false);

					if (done) {
						onClose();
					}
				}}
			>
				「{displayName}
				」を在庫から削除します。内訳と履歴も消えます。よろしいですか。
			</ConfirmDialog>
		</>
	);

	const back =
		view.name === "main" ? undefined : (
			<IconButton icon="chevron-left" label="戻る" onClick={panel.goMain} />
		);

	// 入れた分の編集：PC は、本体のパネルの横に、もう1枚。スマホは、同じシートの中身を切り替える（シートは重ねない）。
	const editingLot = editingLotId
		? item.lots.find((lot) => lot.id === editingLotId)
		: undefined;

	function closeLotEditor() {
		const label = editingLot ? lotLabel(editingLot) : null;

		setEditingLotId(null);
		panel.setErrorMessage(null);

		// 閉じたら、押した行へ、フォーカスを戻す。
		if (label) {
			window.setTimeout(() => {
				document
					.querySelector<HTMLElement>(
						`button[aria-label="${CSS.escape(`${label}を直す`)}"]`,
					)
					?.focus({ preventScroll: true });
			}, 0);
		}
	}

	// 編集の失敗は、編集の側に出す（スマホでは、本体が隠れているため）。
	const lotEditor = editingLot ? (
		<>
			{errorNote}
			<LotEditor
				key={editingLot.id}
				item={item}
				lot={editingLot}
				label={lotLabel(editingLot)}
				today={panel.today}
				amountText={formatQuantityText(item, editingLot.quantity)}
				readOnly={readOnly}
				canAdjust={!isPresence && Boolean(actions.adjustInventoryItem)}
				canEditExpiry={Boolean(actions.updateInventoryLot)}
				onAdjust={(operation, quantityText) =>
					panel.run.adjustLot(editingLot, operation, quantityText)
				}
				onSave={(edits) => panel.run.saveLotEdits(editingLot, edits)}
				onClose={closeLotEditor}
			/>
		</>
	) : null;

	if (mode === "floating") {
		// 浮いたパネルには、閉じる動きがない。
		if (!open) {
			return null;
		}

		return (
			<>
				<FloatingPanel
					id={mainPanelId}
					handleRef={mainPanelRef}
					// 本体を動かしたら、横の編集も、付いて動く。
					onMove={(position) =>
						editorPanelRef.current?.moveTo(besidePosition(position))
					}
					title={heading}
					headerLeading={back}
					headerTrailing={menu}
					footer={bar}
					getInitialPosition={() =>
						anchoredPosition(anchorTileKey, anchorPlacement)
					}
					followTop={() => anchoredTop(anchorTileKey)}
					onEscape={() =>
						editingLot
							? closeLotEditor()
							: view.name === "main"
								? onClose()
								: panel.goMain()
					}
					onClose={onClose}
				>
					{content}
				</FloatingPanel>

				{editingLot ? (
					<FloatingPanel
						key={editingLot.id}
						title={lotLabel(editingLot)}
						handleRef={editorPanelRef}
						getInitialPosition={() => editorPositionRef.current}
						// Esc は、本体のパネルの側で、こちらを先に閉じる。
						onEscape={() => {}}
						onClose={closeLotEditor}
					>
						{lotEditor}
					</FloatingPanel>
				) : null}
			</>
		);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (next) {
					return;
				}

				// 1回目は、編集やフォームを閉じて本体に戻る。もう1回で、パネルを閉じる。
				if (editingLot) {
					closeLotEditor();
				} else if (view.name === "main") {
					onClose();
				} else {
					panel.goMain();
				}
			}}
			title={editingLot ? lotLabel(editingLot) : heading}
			headerLeading={
				editingLot ? (
					<IconButton
						icon="chevron-left"
						label="戻る"
						onClick={closeLotEditor}
					/>
				) : (
					back
				)
			}
			headerTrailing={editingLot ? undefined : menu}
			footer={editingLot ? undefined : (bar ?? undefined)}
			snapPoints={view.name === "main" && !editingLot ? [0.62, 0.92] : [0.92]}
		>
			{editingLot ? lotEditor : content}
		</Sheet>
	);
}

const edge = 8;

// 開く位置：押した行と同じ高さ。overlap は、パネルの中央が行（リスト）の右端、beside は、行の右隣。
const mainPanelId = "inventory-item-panel";
const panelGap = 12;

// 本体を動かしたときの、横の編集の位置（右に入れば右、入らなければ左）。
function besidePosition(main: PanelPosition): PanelPosition {
	const right = main.x + floatingPanelWidth + panelGap;

	return {
		x:
			right + floatingPanelWidth <= window.innerWidth - panelGap
				? right
				: main.x - panelGap - floatingPanelWidth,
		y: main.y,
	};
}

// 本体のパネルの横に、もう1枚を置く位置。右、左の順に探し、どちらにも入らなければ、本体を左へずらして、右に並べる。
// 戻り値の main は、本体を動かす先（動かさなくてよければ null）。
function placeBesidePanel(id: string): {
	editor: PanelPosition;
	main: PanelPosition | null;
} {
	const rect = document.getElementById(id)?.getBoundingClientRect();

	if (!rect) {
		return { editor: { x: window.innerWidth, y: 80 }, main: null };
	}

	const limit = window.innerWidth - panelGap;
	const right = rect.right + panelGap;

	if (right + floatingPanelWidth <= limit) {
		return { editor: { x: right, y: rect.top }, main: null };
	}

	const left = rect.left - panelGap - floatingPanelWidth;

	if (left >= panelGap) {
		return { editor: { x: left, y: rect.top }, main: null };
	}

	const mainX = Math.max(panelGap, limit - floatingPanelWidth * 2 - panelGap);

	return {
		editor: { x: mainX + floatingPanelWidth + panelGap, y: rect.top },
		main: { x: mainX, y: rect.top },
	};
}

function anchorRect(tileKey: string | undefined) {
	const row = tileKey
		? document.querySelector<HTMLElement>(
				`[data-tile-key="${CSS.escape(tileKey)}"]`,
			)
		: null;

	return row?.getBoundingClientRect();
}

// パネルの上端を置く高さ：押した行の少し上。行が見つからなければ（消えた・表示を切り替えた）、null。
function anchoredTop(tileKey: string | undefined): number | null {
	const rect = anchorRect(tileKey);

	return rect ? rect.top - 8 : null;
}

function anchoredPosition(
	tileKey: string | undefined,
	placement: "overlap" | "beside",
) {
	const rect = anchorRect(tileKey);
	const left = rect
		? placement === "beside"
			? rect.right + edge
			: rect.right - floatingPanelWidth / 2
		: window.innerWidth / 2;
	const x = Math.min(left, window.innerWidth - floatingPanelWidth - edge);

	return clampPanelPosition(x, anchoredTop(tileKey) ?? 24);
}
