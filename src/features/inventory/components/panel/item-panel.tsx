import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Card } from "#/components/card/card";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Field, SelectBox, TextInput } from "#/components/field/field";
import { input as fieldInput } from "#/components/field/field.css";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { IconButton } from "#/components/icon-button/icon-button";
import { Note } from "#/components/note/note";
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
import { ExpiryFields } from "../expiry-fields";
import type { InventoryActions } from "./inventory-actions";
import * as styles from "./item-panel.css";
import { isCurrentUnit, toOptionValue, useItemPanel } from "./use-item-panel";

export type ItemPanelMode = "sheet-bottom" | "sheet-right" | "fixed";

type ItemPanelProps = {
	item: InventoryListItem;
	// 開いたタイルのゾーン。そのゾーンのロットを先頭に並べる。
	zone: InventoryZoneId;
	mode: ItemPanelMode;
	actions: InventoryActions;
	// 通信できず、保存済みの在庫を見ているとき。書き換える操作は、押すと理由を出す。
	readOnly: boolean;
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
	onClose,
	onUpdate,
	onDeleted,
}: ItemPanelProps) {
	const panel = useItemPanel({ item, actions, onUpdate, onDeleted });
	const primary = useButtonAction();
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeletePending, setIsDeletePending] = useState(false);
	const [isFlashing, setIsFlashing] = useState(false);
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

	const sortedLots = sortLotsForConsumption(item.lots).sort((a, b) => {
		const aHere = getLotZone(item, a) === zone ? 0 : 1;
		const bHere = getLotZone(item, b) === zone ? 0 : 1;

		return aHere - bHere;
	});

	const lotLabel = (lot: InventoryLot) =>
		`${formatShortDate(lot.acquiredOn)}に追加`;

	// ---- 本文・見出し・操作バーを、いまの画面で決める ----
	let heading = title;
	let body: ReactNode;
	let bar: ReactNode = null;

	const cancel = (
		<Button variant="secondary" onClick={panel.goMain}>
			キャンセル
		</Button>
	);
	const status = primary.status;

	if (view.name === "adjust") {
		heading = `${displayName}の調整数量`;
		body = (
			<div className={styles.formStack}>
				<div className={styles.quantityLine}>
					<QuantityInput
						className={fieldInput}
						aria-label={`${item.name}の調整数量`}
						value={panel.adjustForm.quantity}
						onChange={panel.adjustForm.setQuantity}
						unitLabel={item.stockUnitLabel}
					/>
					<span className={styles.unitSuffix}>{item.stockUnitLabel}</span>
				</div>

				{item.lots.length > 1 ? (
					<div className={styles.lotFieldList}>
						<label className={styles.checkLine}>
							<input
								type="checkbox"
								checked={panel.adjustForm.isLotSpecified}
								onChange={(event) =>
									panel.adjustForm.setIsLotSpecified(event.target.checked)
								}
							/>
							ロットを指定して減らす
						</label>

						{panel.adjustForm.isLotSpecified
							? item.lots.map((lot) => (
									<Field
										key={lot.id}
										label={`${lotLabel(lot)}（${formatStockAmount(lot.quantity, item.stockUnitCode)}${item.stockUnitLabel}）`}
									>
										{(control) => (
											<TextInput
												{...control}
												aria-label={`${lotLabel(lot)}のロットから減らす数量`}
												type="number"
												inputMode="decimal"
												min="0"
												step="any"
												value={panel.adjustForm.lotQuantities[lot.id] ?? ""}
												onChange={(event) =>
													panel.adjustForm.setLotQuantity(
														lot.id,
														event.target.value,
													)
												}
											/>
										)}
									</Field>
								))
							: null}
					</div>
				) : null}
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="3">
				{cancel}
				<Button
					variant="secondary"
					disabled={item.quantity === 0}
					disabledReason="在庫が 0 のため、減らせません。"
					onClick={() => runPrimary(() => panel.run.adjust("decrease"))}
				>
					減らす
				</Button>
				<Button
					status={status}
					onClick={() => runPrimary(() => panel.run.adjust("increase"))}
				>
					増やす
				</Button>
			</div>
		);
	} else if (view.name === "lot-quantity") {
		const lot = item.lots.find((candidate) => candidate.id === view.lotId);

		heading = lot ? lotLabel(lot) : heading;
		body = (
			<div className={styles.formStack}>
				<div className={styles.quantityLine}>
					<QuantityInput
						className={fieldInput}
						aria-label={`${lot ? lotLabel(lot) : ""}のロットの数量`}
						value={panel.lotQuantityForm.value}
						onChange={panel.lotQuantityForm.setValue}
						unitLabel={item.stockUnitLabel}
					/>
					<span className={styles.unitSuffix}>{item.stockUnitLabel}</span>
				</div>
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="2">
				{cancel}
				<Button
					status={status}
					onClick={() =>
						runPrimary(() => panel.run.saveLotQuantity(view.lotId))
					}
				>
					この数量にする
				</Button>
			</div>
		);
	} else if (view.name === "lot-expiry") {
		const lot = item.lots.find((candidate) => candidate.id === view.lotId);

		heading = lot ? lotLabel(lot) : heading;
		body = (
			<div className={styles.formStack}>
				<ExpiryFields
					value={panel.lotExpiryForm.value}
					onChange={panel.lotExpiryForm.setValue}
					today={panel.today}
				/>
				<label className={styles.checkLine}>
					<input
						type="checkbox"
						checked={panel.lotExpiryForm.saveAsDefault}
						onChange={(event) =>
							panel.lotExpiryForm.setSaveAsDefault(event.target.checked)
						}
					/>
					この食材の初期値にする（期限の種類・保存方法）
				</label>
			</div>
		);
		bar = (
			<div className={styles.bar} data-columns="2">
				{cancel}
				<Button
					status={status}
					onClick={() =>
						lot ? runPrimary(() => panel.run.saveLotExpiry(lot)) : undefined
					}
				>
					保存
				</Button>
			</div>
		);
	} else if (view.name === "unit") {
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
						ロットごとの量（換算した目安が入っています。違えば直してください）
					</p>
					{item.lots.map((lot) => (
						<div key={lot.id} className={styles.lotFieldList}>
							<span>
								{lotLabel(lot)}
								{formatLotExpiry(lot) ? `（${formatLotExpiry(lot)}）` : ""}
							</span>
							<QuantityInput
								className={fieldInput}
								aria-label={`${lotLabel(lot)}のロットの新しい単位での量`}
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
				<Button status={status} onClick={() => runPrimary(panel.run.rename)}>
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

				<Field label="管理方法">
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
					<Button
						fullWidth
						disabled={readOnly}
						disabledReason={offlineMessage}
						onClick={panel.open.adjust}
					>
						調整
					</Button>
				) : null}

				{item.lots.length > 0 ? (
					<Card>
						<ul className={styles.lotList} aria-label={`${item.name}のロット`}>
							{sortedLots.map((lot) => {
								const expiryText = formatLotExpiry(lot);
								const badge = findNearestExpiry([lot], panel.today);
								const lotZone = getLotZone(item, lot);

								return (
									<li className={styles.lot} key={lot.id}>
										<div className={styles.lotLine}>
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
										</div>

										{expiryText || badge ? (
											<div className={styles.lotLine}>
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
											</div>
										) : null}

										{actions.setLotQuantity || actions.updateInventoryLot ? (
											<div className={styles.lotButtons} data-zone={lotZone}>
												{actions.setLotQuantity && !isPresence ? (
													<Button
														variant="secondary"
														size="sm"
														disabled={readOnly}
														disabledReason={offlineMessage}
														aria-label={`${lotLabel(lot)}のロットの数量を直す`}
														onClick={() => panel.open.lotQuantity(lot)}
													>
														数量
													</Button>
												) : null}
												{actions.updateInventoryLot ? (
													<Button
														variant="secondary"
														size="sm"
														disabled={readOnly}
														disabledReason={offlineMessage}
														aria-label={`${lotLabel(lot)}のロットの期限を編集`}
														onClick={() => panel.open.lotExpiry(lot)}
													>
														期限
													</Button>
												) : null}
											</div>
										) : null}
									</li>
								);
							})}
						</ul>
					</Card>
				) : null}

				<Card>
					<div className={styles.card}>
						{actions.changeTrackingMode ? (
							isPresence ? (
								<RowButton
									icon="sliders"
									readOnly={readOnly}
									onClick={guard(panel.open.tracking)}
								>
									量を追う管理にする
								</RowButton>
							) : (
								<RowButton
									icon="swap"
									readOnly={readOnly}
									onClick={guard(
										() =>
											void panel.run.changeTracking({
												trackingMode: "presence",
											}),
									)}
								>
									有無だけにする
								</RowButton>
							)
						) : null}
						{actions.changeStockUnit && !isPresence ? (
							<RowButton
								icon="ruler"
								readOnly={readOnly}
								label={`${displayName}の単位を変える`}
								onClick={guard(panel.open.unit)}
							>
								単位を変える
							</RowButton>
						) : null}
						{actions.renameInventoryItem ? (
							<RowButton
								icon="edit"
								readOnly={readOnly}
								label={`${displayName}の名前を変更`}
								onClick={guard(panel.open.rename)}
							>
								名前を変更
							</RowButton>
						) : null}
					</div>
				</Card>

				{actions.deleteInventoryItem ? (
					<Card>
						<RowButton
							icon="trash"
							danger
							readOnly={readOnly}
							label={`${displayName}を在庫から削除`}
							onClick={guard(() => setIsDeleting(true))}
						>
							削除
						</RowButton>
					</Card>
				) : null}
			</div>
		);
	}

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
				」を在庫から削除します。ロットと履歴も消えます。よろしいですか。
			</ConfirmDialog>
		</>
	);

	const back =
		view.name === "main" ? undefined : (
			<IconButton icon="chevron-left" label="戻る" onClick={panel.goMain} />
		);

	if (mode === "fixed") {
		return (
			<FixedPanel
				title={heading}
				back={back}
				footer={bar}
				onClose={() => (view.name === "main" ? onClose() : panel.goMain())}
				onCloseAll={onClose}
			>
				{content}
			</FixedPanel>
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
			footer={bar ?? undefined}
			placement={mode === "sheet-right" ? "right" : "bottom"}
			snapPoints={view.name === "main" ? [0.62, 0.92] : [0.92]}
		>
			{content}
		</Sheet>
	);
}

function RowButton({
	icon,
	children,
	onClick,
	readOnly,
	danger = false,
	label,
}: {
	icon: IconName;
	children: ReactNode;
	onClick: () => void;
	readOnly: boolean;
	danger?: boolean;
	label?: string;
}) {
	return (
		<button
			className={styles.rowButton}
			type="button"
			aria-label={label}
			aria-disabled={readOnly || undefined}
			data-danger={danger || undefined}
			onClick={onClick}
		>
			<Icon name={icon} size={20} />
			{children}
		</button>
	);
}

// PC の固定のパネル（モーダルにしない。冷蔵庫を見ながら操作できる）。
function FixedPanel({
	title,
	back,
	footer,
	children,
	onClose,
	onCloseAll,
}: {
	title: string;
	back?: ReactNode;
	footer: ReactNode;
	children: ReactNode;
	onClose: () => void;
	onCloseAll: () => void;
}) {
	const headingRef = useRef<HTMLHeadingElement>(null);

	// 開いたら見出しへ。Esc で閉じる（フォームが開いていれば、まずフォームを閉じる）。
	useEffect(() => {
		headingRef.current?.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && !event.defaultPrevented) {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<aside className={styles.fixed} aria-label={title}>
			<div className={styles.fixedHeader}>
				{back}
				<h2 className={styles.fixedTitle} ref={headingRef} tabIndex={-1}>
					{title}
				</h2>
				<IconButton icon="close" label="閉じる" onClick={onCloseAll} />
			</div>
			<div className={styles.fixedBody}>{children}</div>
			{footer ? <div className={styles.fixedFooter}>{footer}</div> : null}
		</aside>
	);
}
