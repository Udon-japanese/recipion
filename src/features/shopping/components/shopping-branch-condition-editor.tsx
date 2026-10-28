import { useState } from "react";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Field, SelectBox, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import * as styles from "./shopping-branch-condition-editor.css";

export type BranchConditionValue = {
	// 買う店（なければ空）。
	storeId: string;
	name: string;
	quantity: string;
	unitLabel: string;
	// どんな時に（売っていたら・安ければ）。
	condition: string;
	// 「そうなら」「そうでなければ」の呼び名（省略できる）。
	thenLabel: string;
	elseLabel: string;
};

type ConditionPart = "store" | "name" | "amount" | "condition";

type ShoppingBranchConditionEditorProps = {
	open: boolean;
	value: BranchConditionValue;
	stores: readonly { id: string; name: string }[];
	onCancel: () => void;
	// 保存できたら true（閉じるのは、呼ぶ側）。
	onSave: (value: BranchConditionValue) => Promise<boolean>;
};

function describeAmount(value: BranchConditionValue): string {
	return `${value.quantity}${value.unitLabel}`.trim();
}

// 条件を直す：いまの設定を文章で見せ、直したい部分（店・材料・数量・どんな時に）を押すと、その入力だけが開く。
// 上のカード＋角のボタン（キャンセル／保存）。
export function ShoppingBranchConditionEditor({
	open,
	value,
	stores,
	onCancel,
	onSave,
}: ShoppingBranchConditionEditorProps) {
	const [draft, setDraft] = useState(value);
	const [part, setPart] = useState<ConditionPart | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const storeName = stores.find((store) => store.id === draft.storeId)?.name;
	const amount = describeAmount(draft);
	const isValid = draft.name.trim() !== "" && draft.condition.trim() !== "";

	function update(patch: Partial<BranchConditionValue>) {
		setDraft({ ...draft, ...patch });
	}

	function togglePart(next: ConditionPart) {
		setPart(part === next ? null : next);
	}

	async function handleSave() {
		setIsSaving(true);

		try {
			await onSave(draft);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<CornerSheet
			open={open}
			eyebrow="条件つきのメモ"
			title="条件を直す"
			onDismiss={isSaving ? undefined : onCancel}
			left={{
				label: "キャンセル",
				icon: "close",
				disabled: isSaving,
				onClick: onCancel,
			}}
			right={{
				label: "保存",
				icon: "check",
				disabled: !isValid,
				pending: isSaving,
				onClick: () => void handleSave(),
			}}
		>
			<div className={styles.preview} aria-live="polite">
				<p className={styles.previewTitle}>こう動きます</p>
				<p className={styles.previewCondition}>
					{`${storeName ? `${storeName}に` : ""}${draft.name}${amount ? ` ${amount}` : ""}が${draft.condition}…`}
				</p>
				<p className={styles.previewSide}>
					<Icon name="check-circle" size={16} />
					{`そうなら：${draft.thenLabel || "（呼び名なし）"}`}
				</p>
				<p className={styles.previewSide}>
					<Icon name="ban-circle" size={16} />
					{`そうでなければ：${draft.elseLabel || "（呼び名なし）"}`}
				</p>
			</div>

			<fieldset className={styles.group}>
				<legend className={styles.groupLabel}>何が、どうなったら</legend>
				<div className={styles.sentence}>
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "store"}
						onClick={() => togglePart("store")}
					>
						{storeName ? (
							<>
								{storeName}
								<span className={styles.tokenSub}>店</span>
							</>
						) : (
							<span className={styles.tokenEmpty}>店を選ぶ</span>
						)}
					</button>
					{storeName ? <span className={styles.joshi}>に</span> : null}
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "name"}
						onClick={() => togglePart("name")}
					>
						{draft.name || <span className={styles.tokenEmpty}>材料</span>}
					</button>
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "amount"}
						onClick={() => togglePart("amount")}
					>
						{amount || <span className={styles.tokenEmpty}>数量</span>}
					</button>
					<span className={styles.joshi}>が</span>
					<button
						type="button"
						className={styles.token}
						aria-pressed={part === "condition"}
						onClick={() => togglePart("condition")}
					>
						{draft.condition || (
							<span className={styles.tokenEmpty}>どんな時に</span>
						)}
					</button>
				</div>

				{part ? (
					<div className={styles.editor}>
						{part === "store" ? (
							<Field label="買う店" hint="決めなくてもかまいません。">
								{(control) => (
									<SelectBox
										{...control}
										value={draft.storeId}
										onChange={(event) =>
											update({ storeId: event.target.value })
										}
									>
										<option value="">決めない</option>
										{stores.map((store) => (
											<option value={store.id} key={store.id}>
												{store.name}
											</option>
										))}
									</SelectBox>
								)}
							</Field>
						) : null}
						{part === "name" ? (
							<Field label="材料">
								{(control) => (
									<TextInput
										{...control}
										value={draft.name}
										onChange={(event) => update({ name: event.target.value })}
										autoComplete="off"
									/>
								)}
							</Field>
						) : null}
						{part === "amount" ? (
							<div className={styles.pair}>
								<Field label="数量">
									{(control) => (
										<TextInput
											{...control}
											inputMode="decimal"
											value={draft.quantity}
											onChange={(event) =>
												update({ quantity: event.target.value })
											}
											autoComplete="off"
										/>
									)}
								</Field>
								<Field label="単位">
									{(control) => (
										<TextInput
											{...control}
											value={draft.unitLabel}
											onChange={(event) =>
												update({ unitLabel: event.target.value })
											}
											autoComplete="off"
										/>
									)}
								</Field>
							</div>
						) : null}
						{part === "condition" ? (
							<Field label="どんな時に" hint="例：売っていたら、安ければ">
								{(control) => (
									<TextInput
										{...control}
										value={draft.condition}
										onChange={(event) =>
											update({ condition: event.target.value })
										}
										autoComplete="off"
									/>
								)}
							</Field>
						) : null}
					</div>
				) : (
					<p className={styles.joshi}>直したい部分を押してください。</p>
				)}
			</fieldset>

			<fieldset className={styles.group}>
				<legend className={styles.groupLabel}>
					2つの場合の呼び名（省略できます）
				</legend>
				<div className={styles.pair}>
					<Field label="そうなら">
						{(control) => (
							<TextInput
								{...control}
								value={draft.thenLabel}
								placeholder="例：ハンバーグ"
								onChange={(event) => update({ thenLabel: event.target.value })}
								autoComplete="off"
							/>
						)}
					</Field>
					<Field label="そうでなければ">
						{(control) => (
							<TextInput
								{...control}
								value={draft.elseLabel}
								placeholder="例：生姜焼き"
								onChange={(event) => update({ elseLabel: event.target.value })}
								autoComplete="off"
							/>
						)}
					</Field>
				</div>
			</fieldset>
		</CornerSheet>
	);
}
