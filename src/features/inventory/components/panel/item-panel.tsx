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
	floatingPanelWidth,
} from "#/components/floating-panel/floating-panel";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { IconButton } from "#/components/icon-button/icon-button";
import { Menu, type MenuItem } from "#/components/menu/menu";
import { Note } from "#/components/note/note";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { listStockUnitOptions } from "#/features/ingredients/domain/list-stock-unit-options";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatStockAmount } from "#/features/quantity/domain/format-quantity";
import { formatQuantityInput } from "#/features/quantity/domain/quantity-buttons";
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
import type { InventoryActions } from "./inventory-actions";
import * as styles from "./item-panel.css";
import { LotEditor } from "./lot-editor";
import { isCurrentUnit, toOptionValue, useItemPanel } from "./use-item-panel";

export type ItemPanelMode = "sheet-bottom" | "floating";

type ItemPanelProps = {
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
	const [isConfirmingPresence, setIsConfirmingPresence] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeletePending, setIsDeletePending] = useState(false);
	const [isFlashing, setIsFlashing] = useState(false);
	// 内訳のうち、その場で直している行。
	const [editingLotId, setEditingLotId] = useState<string | null>(null);
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
	function runAdjust(
		operation: "decrease" | "increase",
		action: () => Promise<boolean>,
	) {
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
		heading = `${displayName}のいまの量`;
		body = (
			<div className={styles.formStack}>
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

				<Field label="数え方">
					{(control) => (
						<SelectBox
							{...control}
							value={panel.trackingForm.mode}
							onChange={(event) =>
								panel.trackingForm.setMode(
									event.target.value === "exact" ? "exact" : "estimated",
								)
							}
						>
							<option value="estimated">だいたいで管理</option>
							<option value="exact">正確に管理</option>
						</SelectBox>
					)}
				</Field>
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="2">
				{cancel}
				<Button
					fullWidth
					status={status}
					onClick={() => runPrimary(panel.run.startTracking)}
				>
					この量で管理する
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
					<AdjustForm
						item={item}
						panel={panel}
						lotLabel={lotLabel}
						readOnly={readOnly}
						onRun={(operation) =>
							runAdjust(operation, () => panel.run.adjust(operation))
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
									actions.setLotQuantity || actions.updateInventoryLot,
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
														approximate={badge.approximate}
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
												onClick={guard(() =>
													setEditingLotId(isEditing ? null : lot.id),
												)}
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

										{isEditing ? (
											<LotEditor
												item={item}
												lot={lot}
												label={lotLabel(lot)}
												today={panel.today}
												isPresence={isPresence || !actions.setLotQuantity}
												onSave={(edits) => panel.run.saveLotEdits(lot, edits)}
												onClose={() => setEditingLotId(null)}
											/>
										) : null}
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
					isPresence
						? {
								label: "量を追う管理にする",
								icon: "settings" as const,
								onSelect: guard(panel.open.tracking),
							}
						: {
								label: "有無だけにする",
								icon: "swap" as const,
								onSelect: guard(() => setIsConfirmingPresence(true)),
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

	const content = (
		<>
			{panel.errorMessage ? (
				<div className={styles.formStack}>
					<Note tone="error">{panel.errorMessage}</Note>
				</div>
			) : null}
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
			<ConfirmDialog
				open={isConfirmingPresence}
				title="有無だけにしますか"
				cancelLabel="やめる"
				confirmLabel="有無だけにする"
				onCancel={() => setIsConfirmingPresence(false)}
				onConfirm={async () => {
					await panel.run.changeTracking({ trackingMode: "presence" });
					setIsConfirmingPresence(false);
				}}
			>
				「{displayName}
				」の量を数えるのをやめ、あるかどうかだけを記録します。あれば、レシピでは「足りている」とします。
			</ConfirmDialog>
		</>
	);

	const back =
		view.name === "main" ? undefined : (
			<IconButton icon="chevron-left" label="戻る" onClick={panel.goMain} />
		);

	if (mode === "floating") {
		return (
			<FloatingPanel
				title={heading}
				headerLeading={back}
				headerTrailing={menu}
				footer={bar}
				getInitialPosition={() =>
					anchoredPosition(anchorTileKey, anchorPlacement)
				}
				onEscape={() => (view.name === "main" ? onClose() : panel.goMain())}
				onClose={onClose}
			>
				{content}
			</FloatingPanel>
		);
	}

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (open) {
					return;
				}

				// 1回目は、フォームを閉じて本体に戻る。もう1回で、パネルを閉じる。
				if (view.name === "main") {
					onClose();
				} else {
					panel.goMain();
				}
			}}
			title={heading}
			headerLeading={back}
			headerTrailing={menu}
			footer={bar ?? undefined}
			snapPoints={view.name === "main" ? [0.62, 0.92] : [0.92]}
		>
			{content}
		</Sheet>
	);
}

type PanelState = ReturnType<typeof useItemPanel>;
type ButtonStatus = ReturnType<typeof useButtonAction>["status"];

// 使った量・買い足した量（パネルの本体に置く。量を打って、ボタンを押す）。
// 内訳が2つ以上なら、入れた分ごとに減らす欄に切り替えられる。
function AdjustForm({
	item,
	panel,
	lotLabel,
	readOnly,
	onRun,
	decreaseStatus,
	increaseStatus,
}: {
	item: InventoryListItem;
	panel: PanelState;
	lotLabel: (lot: InventoryLot) => string;
	readOnly: boolean;
	onRun: (operation: "decrease" | "increase") => void;
	decreaseStatus: ButtonStatus;
	increaseStatus: ButtonStatus;
}) {
	const form = panel.adjustForm;
	const canSpecifyLots = item.lots.length > 1;
	const isLotSpecified = canSpecifyLots && form.isLotSpecified;

	return (
		<div className={styles.adjust}>
			{isLotSpecified ? (
				<div className={styles.lotFieldList}>
					{item.lots.map((lot) => (
						<Field
							key={lot.id}
							label={`${lotLabel(lot)}（${formatStockAmount(lot.quantity, item.stockUnitCode)}${item.stockUnitLabel}）`}
						>
							{(control) => (
								<TextInput
									{...control}
									aria-label={`${lotLabel(lot)}から減らす数量`}
									type="number"
									inputMode="decimal"
									min="0"
									step="any"
									value={form.lotQuantities[lot.id] ?? ""}
									onChange={(event) =>
										form.setLotQuantity(lot.id, event.target.value)
									}
								/>
							)}
						</Field>
					))}
				</div>
			) : (
				<QuantityInput
					className={fieldInput}
					aria-label={`${item.name}の使った量・買い足した量`}
					value={form.quantity}
					onChange={form.setQuantity}
					unitLabel={item.stockUnitLabel}
					trailing={
						<span className={styles.unitSuffix}>{item.stockUnitLabel}</span>
					}
					// 「使った」なら全部、「買い足した」なら同じだけ。
					presetButton={
						item.quantity > 0
							? { label: "今ある分", value: formatQuantityInput(item.quantity) }
							: undefined
					}
				/>
			)}

			<div className={styles.primaryActions}>
				<Button
					variant="secondary"
					fullWidth
					status={decreaseStatus}
					disabled={readOnly || item.quantity === 0}
					disabledReason={
						readOnly ? offlineMessage : "在庫が 0 のため、減らせません。"
					}
					onClick={() => onRun("decrease")}
				>
					使った
				</Button>
				{isLotSpecified ? null : (
					<Button
						fullWidth
						status={increaseStatus}
						disabled={readOnly}
						disabledReason={offlineMessage}
						onClick={() => onRun("increase")}
					>
						買い足した
					</Button>
				)}
			</div>

			{canSpecifyLots ? (
				<button
					type="button"
					className={styles.textButton}
					aria-pressed={isLotSpecified}
					onClick={() => form.setIsLotSpecified(!isLotSpecified)}
				>
					{isLotSpecified ? "まとめて入力する" : "入れた分ごとに減らす"}
				</button>
			) : null}
		</div>
	);
}

const edge = 8;

// 開く位置：押した行と同じ高さ。overlap は、パネルの中央が行（リスト）の右端、beside は、行の右隣。
function anchoredPosition(
	tileKey: string | undefined,
	placement: "overlap" | "beside",
) {
	const row = tileKey
		? document.querySelector<HTMLElement>(
				`[data-tile-key="${CSS.escape(tileKey)}"]`,
			)
		: null;
	const rect = row?.getBoundingClientRect();
	const left = rect
		? placement === "beside"
			? rect.right + edge
			: rect.right - floatingPanelWidth / 2
		: window.innerWidth / 2;
	const x = Math.min(left, window.innerWidth - floatingPanelWidth - edge);

	return clampPanelPosition(x, rect ? rect.top - 8 : 24);
}
