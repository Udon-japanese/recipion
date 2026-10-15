import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { Menu, type MenuItem } from "#/components/menu/menu";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import { type RecipeLinkView, splitTextByLinks } from "../domain/recipe-links";
import { InlineText } from "./inline-text";
import * as styles from "./recipe-editor.css";
import { RecipeText } from "./recipe-text";

// 材料の行の入力で Enter を押すと、フォーム全体が保存されてしまう。
// 変換確定中の Enter は IME に任せる。
export function preventSubmitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
	if (event.key === "Enter" && !event.nativeEvent.isComposing) {
		event.preventDefault();
	}
}

export type GroupOption = { id: string; name: string };

export function listGroupOptions(
	nodes: readonly RecipeEditorIngredientNode[],
): GroupOption[] {
	return nodes.flatMap((node) =>
		node.type === "group"
			? [{ id: node.id, name: node.name }, ...listGroupOptions(node.children)]
			: [],
	);
}

type IngredientPreviewNodeProps = {
	node: RecipeEditorIngredientNode;
	parentGroupId?: string | null;
	groups: readonly GroupOption[];
	// プレビューで手直しした材料・グループの ID。
	editedIds: ReadonlySet<string>;
	onChange: (
		id: string,
		changes: { name?: string; amountText?: string },
	) => void;
	onMove: (id: string, targetGroupId: string | null) => void;
	onRemove: (id: string) => void;
	onRenameGroup: (id: string, name: string) => void;
	onRemoveGroup: (id: string) => void;
	onRevert: (id: string) => void;
	// グループの中に、材料を足す（groupId が null なら、グループ外）。
	onAdd: (groupId: string | null, name: string, amountText: string) => void;
	// 材料の名前の [[ラベル]] の、リンク先。リンクの材料は、保存後と同じ表示にして、ここでは、直せない（直すときは、入力欄の文章を直す）。
	linkViews: readonly RecipeLinkView[];
	// リンクを押したとき（プレビューを開く）。
	onOpenLink?: (publicId: string, trigger: HTMLElement) => void;
};

// 手直しした行にだけ出す、元に戻すボタン。
function RevertButton({
	label,
	onRevert,
}: {
	label: string;
	onRevert: () => void;
}) {
	return (
		<IconButton
			icon="undo"
			label={`${label}の手直しを元に戻す`}
			title="手直し済み（元に戻す）"
			tone="plain"
			onClick={onRevert}
		/>
	);
}

function groupLabel(name: string) {
	return name.trim() === "" ? "（名前なし）" : name;
}

export function IngredientPreviewNode({
	node,
	parentGroupId = null,
	groups,
	editedIds,
	onChange,
	onMove,
	onRemove,
	onRenameGroup,
	onRemoveGroup,
	onRevert,
	onAdd,
	linkViews,
	onOpenLink,
}: IngredientPreviewNodeProps) {
	if (node.type === "group") {
		return (
			<li className={styles.groupItem}>
				<div className={styles.groupHeader}>
					<div className={styles.groupName}>
						<InlineText
							value={node.name}
							onChange={(value) => onRenameGroup(node.id, value)}
							label={`${node.name}のグループ名`}
							placeholder="グループ名"
							weight="strong"
						/>
					</div>
					{node.inferred ? (
						<span className={styles.inferredTag}>推定</span>
					) : null}
					{editedIds.has(node.id) ? (
						<RevertButton
							label={node.name}
							onRevert={() => onRevert(node.id)}
						/>
					) : null}
					{node.children.length === 0 ? (
						<IconButton
							icon="trash"
							label={`${node.name}のグループを削除`}
							tone="plain"
							onClick={() => onRemoveGroup(node.id)}
						/>
					) : null}
				</div>
				<ul className={styles.groupChildren}>
					{node.children.map((child) => (
						<IngredientPreviewNode
							key={child.id}
							node={child}
							parentGroupId={node.id}
							groups={groups}
							editedIds={editedIds}
							onChange={onChange}
							onMove={onMove}
							onRemove={onRemove}
							onRenameGroup={onRenameGroup}
							onRemoveGroup={onRemoveGroup}
							onRevert={onRevert}
							onAdd={onAdd}
							linkViews={linkViews}
							onOpenLink={onOpenLink}
						/>
					))}
					<li className={styles.addItem}>
						<AddIngredientRow
							scope={node.name}
							onAdd={(name, amountText) => onAdd(node.id, name, amountText)}
						/>
					</li>
				</ul>
			</li>
		);
	}

	// 他のレシピへのリンクの材料は、名前（[[ラベル]]）だけ、保存後と同じ表示にして、ここでは直せない（本文で直す）。分量・グループ・削除は、ふつうの材料と同じ。
	const isLink = splitTextByLinks(node.name).some(
		(segment) => segment.type === "link",
	);

	const menuItems: MenuItem[] = [
		...groups
			.filter((group) => group.id !== parentGroupId)
			.map((group) => ({
				label: `「${groupLabel(group.name)}」へ移動`,
				icon: "arrow-up-right" as const,
				onSelect: () => onMove(node.id, group.id),
			})),
		...(parentGroupId === null
			? []
			: [
					{
						label: "グループから外す",
						icon: "arrow-up" as const,
						onSelect: () => onMove(node.id, null),
					},
				]),
		{
			label: "削除",
			icon: "trash" as const,
			tone: "danger" as const,
			onSelect: () => onRemove(node.id),
		},
	];

	return (
		<li className={styles.ingredientItem}>
			<div className={styles.ingredientRow}>
				{isLink ? (
					<span className={styles.linkedName}>
						<RecipeText
							text={node.name}
							linkViews={linkViews}
							onOpenLink={onOpenLink}
						/>
					</span>
				) : (
					<InlineText
						value={node.name}
						onChange={(value) => onChange(node.id, { name: value })}
						label={`${node.name}の材料名`}
						placeholder="材料名"
						weight="strong"
					/>
				)}
				<InlineText
					value={node.amountText ?? ""}
					onChange={(value) => onChange(node.id, { amountText: value })}
					label={`${node.name}の分量`}
					placeholder="分量なし"
					align="end"
				/>
				{editedIds.has(node.id) ? (
					<RevertButton label={node.name} onRevert={() => onRevert(node.id)} />
				) : (
					<span className={styles.rowActionSpace} />
				)}
				<Menu
					label={`${node.name}のその他`}
					icon="more-horizontal"
					items={menuItems}
				/>
			</div>
		</li>
	);
}

type AddIngredientRowProps = {
	// どこへ足すか（グループ名。グループ外なら空）。読み上げる名前に使う。
	scope?: string;
	onAdd: (name: string, amountText: string) => void;
};

// 「＋ 材料を追加」。押すと、名前と分量の入力が開く。Enter で足して、続けて足せる。Esc で閉じる。
export function AddIngredientRow({ scope = "", onAdd }: AddIngredientRowProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const nameRef = useRef<HTMLInputElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isOpen) {
			nameRef.current?.focus();
		}
	}, [isOpen]);

	function submit() {
		const trimmed = name.trim();

		if (trimmed.length === 0) return;

		onAdd(trimmed, amount.trim());
		setName("");
		setAmount("");
		nameRef.current?.focus();
	}

	function close() {
		setIsOpen(false);
		setName("");
		setAmount("");
		queueMicrotask(() => triggerRef.current?.focus());
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;

		if (event.key === "Enter") {
			event.preventDefault();
			submit();
		} else if (event.key === "Escape") {
			event.preventDefault();
			close();
		}
	}

	if (!isOpen) {
		return (
			<button
				ref={triggerRef}
				className={styles.addTrigger}
				type="button"
				aria-label={scope ? `${scope}に材料を追加` : "材料を追加"}
				onClick={() => setIsOpen(true)}
			>
				<Icon name="plus" size={20} />
				材料を追加
			</button>
		);
	}

	return (
		<div className={styles.addRow}>
			<input
				ref={nameRef}
				className={styles.input}
				aria-label={`${scope}追加する材料名`}
				placeholder="材料名"
				value={name}
				onChange={(event) => setName(event.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<input
				className={styles.input}
				aria-label={`${scope}追加する材料の分量`}
				placeholder="分量なし"
				value={amount}
				onChange={(event) => setAmount(event.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<Button
				variant="secondary"
				size="sm"
				disabled={name.trim().length === 0}
				onClick={submit}
			>
				追加
			</Button>
			<IconButton icon="close" label="閉じる" tone="plain" onClick={close} />
		</div>
	);
}

type AddGroupRowProps = { onAdd: (name: string) => void };

// 「＋ グループを追加」。
export function AddGroupRow({ onAdd }: AddGroupRowProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus();
		}
	}, [isOpen]);

	function submit() {
		const trimmed = name.trim();

		if (trimmed.length === 0) return;

		onAdd(trimmed);
		setName("");
		setIsOpen(false);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;

		if (event.key === "Enter") {
			event.preventDefault();
			submit();
		} else if (event.key === "Escape") {
			event.preventDefault();
			setName("");
			setIsOpen(false);
		}
	}

	if (!isOpen) {
		return (
			<button
				className={styles.addTrigger}
				type="button"
				onClick={() => setIsOpen(true)}
			>
				<Icon name="plus" size={20} />
				グループを追加
			</button>
		);
	}

	return (
		<div className={styles.addRow} data-kind="group">
			<input
				ref={inputRef}
				className={styles.input}
				aria-label="追加するグループ名"
				placeholder="グループ名"
				value={name}
				onChange={(event) => setName(event.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<Button
				variant="secondary"
				size="sm"
				disabled={name.trim().length === 0}
				onClick={submit}
			>
				追加
			</Button>
			<IconButton
				icon="close"
				label="閉じる"
				tone="plain"
				onClick={() => {
					setName("");
					setIsOpen(false);
				}}
			/>
		</div>
	);
}
