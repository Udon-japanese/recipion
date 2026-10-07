import type { KeyboardEvent } from "react";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import * as styles from "./recipe-editor.css";

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
};

function EditedBadge({
	label,
	onRevert,
}: {
	label: string;
	onRevert: () => void;
}) {
	return (
		<span className={styles.editedBadge}>
			手直し済み
			<button
				className={styles.linkButton}
				type="button"
				aria-label={`${label}の手直しを元に戻す`}
				onClick={onRevert}
			>
				元に戻す
			</button>
		</span>
	);
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
}: IngredientPreviewNodeProps) {
	if (node.type === "group") {
		return (
			<li>
				<input
					className={styles.input}
					aria-label={`${node.name}のグループ名`}
					value={node.name}
					onChange={(event) => onRenameGroup(node.id, event.target.value)}
					onKeyDown={preventSubmitOnEnter}
				/>
				{node.inferred ? <span>（推定グループ）</span> : null}
				{editedIds.has(node.id) ? (
					<EditedBadge label={node.name} onRevert={() => onRevert(node.id)} />
				) : null}
				{node.children.length === 0 ? (
					<button
						type="button"
						aria-label={`${node.name}のグループを削除`}
						onClick={() => onRemoveGroup(node.id)}
					>
						グループを削除
					</button>
				) : null}
				<ul className={styles.nestedList}>
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
						/>
					))}
				</ul>
			</li>
		);
	}

	return (
		<li>
			<div className={styles.ingredientRow}>
				<input
					className={styles.input}
					aria-label={`${node.name}の材料名`}
					value={node.name}
					onChange={(event) => onChange(node.id, { name: event.target.value })}
					onKeyDown={preventSubmitOnEnter}
				/>
				<input
					className={styles.input}
					aria-label={`${node.name}の分量`}
					value={node.amountText ?? ""}
					onChange={(event) =>
						onChange(node.id, { amountText: event.target.value })
					}
					onKeyDown={preventSubmitOnEnter}
					placeholder="分量なし"
				/>
				<select
					className={styles.input}
					aria-label={`${node.name}のグループ`}
					value={parentGroupId ?? ""}
					onChange={(event) => {
						const targetGroupId = event.target.value || null;

						if (targetGroupId !== parentGroupId) {
							onMove(node.id, targetGroupId);
						}
					}}
				>
					<option value="">グループ外</option>
					{groups.map((group) => (
						<option key={group.id} value={group.id}>
							{group.name}
						</option>
					))}
				</select>
				<button
					type="button"
					aria-label={`${node.name}を削除`}
					onClick={() => onRemove(node.id)}
				>
					削除
				</button>
			</div>
			{editedIds.has(node.id) ? (
				<EditedBadge label={node.name} onRevert={() => onRevert(node.id)} />
			) : null}
		</li>
	);
}
