import { type KeyboardEvent, type SubmitEvent, useMemo, useState } from "react";
import {
	createRecipeEditorDocument,
	type RecipeEditorDocument,
	type RecipeEditorIngredientGroup,
	type RecipeEditorIngredientItem,
	type RecipeEditorIngredientNode,
} from "../domain/recipe-editor-document";
import * as styles from "./recipe-editor.css";

function updateIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	id: string,
	changes: { name?: string; amountText?: string },
): RecipeEditorIngredientNode[] {
	return nodes.map((node) => {
		if (node.type === "group") {
			return {
				...node,
				children: updateIngredientItem(node.children, id, changes),
			};
		}

		if (node.id !== id) return node;

		const name = changes.name ?? node.name;
		const amountText = changes.amountText ?? node.amountText ?? "";
		const hasAmount = amountText.trim().length > 0;

		const updated: RecipeEditorIngredientItem = hasAmount
			? {
					type: "ingredient",
					status: "parsed",
					id: node.id,
					name,
					rawText: `${name} ${amountText}`,
					amountText,
					quantity: changes.amountText === undefined ? node.quantity : null,
					unitLabel: changes.amountText === undefined ? node.unitLabel : null,
				}
			: {
					type: "ingredient",
					status: "missing-amount",
					id: node.id,
					name,
					rawText: name,
					amountText: null,
					quantity: null,
					unitLabel: null,
				};

		return updated;
	});
}

function createIngredientItem(
	id: string,
	name: string,
	amountText: string,
): RecipeEditorIngredientItem {
	if (amountText.length === 0) {
		return {
			type: "ingredient",
			status: "missing-amount",
			id,
			name,
			rawText: name,
			amountText: null,
			quantity: null,
			unitLabel: null,
		};
	}

	return {
		type: "ingredient",
		status: "parsed",
		id,
		name,
		rawText: `${name} ${amountText}`,
		amountText,
		quantity: null,
		unitLabel: null,
	};
}

function createIngredientGroup(
	id: string,
	name: string,
): RecipeEditorIngredientGroup {
	return {
		type: "group",
		id,
		name,
		rawText: name,
		inferred: false,
		children: [],
	};
}

function removeEmptyIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
): RecipeEditorIngredientNode[] {
	return nodes.flatMap<RecipeEditorIngredientNode>((node) => {
		if (node.type !== "group") return [node];

		if (node.id === groupId && node.children.length === 0) return [];

		return [
			{ ...node, children: removeEmptyIngredientGroup(node.children, groupId) },
		];
	});
}

function hasEmptyIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
): boolean {
	return nodes.some(
		(node) =>
			node.type === "group" &&
			(node.children.length === 0 || hasEmptyIngredientGroup(node.children)),
	);
}

function renameIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
	name: string,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) => {
		if (node.type !== "group") return node;

		if (node.id === groupId) {
			return { ...node, name, rawText: name };
		}

		return {
			...node,
			children: renameIngredientGroup(node.children, groupId, name),
		};
	});
}

function removeIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	itemId: string,
): {
	remaining: RecipeEditorIngredientNode[];
	removed: RecipeEditorIngredientItem | null;
} {
	let removed: RecipeEditorIngredientItem | null = null;

	function remove(
		current: readonly RecipeEditorIngredientNode[],
	): RecipeEditorIngredientNode[] {
		const result: RecipeEditorIngredientNode[] = [];

		for (const node of current) {
			if (node.type === "ingredient") {
				if (node.id === itemId) {
					removed = node;
				} else {
					result.push(node);
				}
				continue;
			}

			const children = remove(node.children);
			// 取り出して空になったグループは消す。もともと空のグループ（作成直後）は残す。
			if (children.length > 0 || node.children.length === 0) {
				result.push({ ...node, children });
			}
		}

		return result;
	}

	return { remaining: remove(nodes), removed };
}

function moveIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	itemId: string,
	targetGroupId: string | null,
): RecipeEditorIngredientNode[] {
	const { remaining, removed: movedItem } = removeIngredientItem(nodes, itemId);

	if (!movedItem) return [...nodes];
	if (targetGroupId === null) return [...remaining, movedItem];

	let foundTarget = false;

	function insert(
		current: readonly RecipeEditorIngredientNode[],
	): RecipeEditorIngredientNode[] {
		return current.map((node) => {
			if (node.type !== "group") return node;

			if (node.id === targetGroupId && movedItem !== null) {
				foundTarget = true;
				return { ...node, children: [...node.children, movedItem] };
			}

			return { ...node, children: insert(node.children) };
		});
	}

	const result = insert(remaining);
	return foundTarget ? result : [...nodes];
}

// 材料の行の入力で Enter を押すと、フォーム全体が保存されてしまう。
// 変換確定中の Enter は IME に任せる。
function preventSubmitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
	if (event.key === "Enter" && !event.nativeEvent.isComposing) {
		event.preventDefault();
	}
}

type GroupOption = { id: string; name: string };

function listGroupOptions(
	nodes: readonly RecipeEditorIngredientNode[],
): GroupOption[] {
	return nodes.flatMap((node) =>
		node.type === "group"
			? [{ id: node.id, name: node.name }, ...listGroupOptions(node.children)]
			: [],
	);
}

function IngredientPreviewNode({
	node,
	parentGroupId = null,
	groups,
	onChange,
	onMove,
	onRemove,
	onRenameGroup,
	onRemoveGroup,
}: {
	node: RecipeEditorIngredientNode;
	parentGroupId?: string | null;
	groups: readonly GroupOption[];
	onChange: (
		id: string,
		changes: { name?: string; amountText?: string },
	) => void;
	onMove: (id: string, targetGroupId: string | null) => void;
	onRemove: (id: string) => void;
	onRenameGroup: (id: string, name: string) => void;
	onRemoveGroup: (id: string) => void;
}) {
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
							onChange={onChange}
							onMove={onMove}
							onRemove={onRemove}
							onRenameGroup={onRenameGroup}
							onRemoveGroup={onRemoveGroup}
						/>
					))}
				</ul>
			</li>
		);
	}

	return (
		<li className={styles.ingredientRow}>
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
		</li>
	);
}

type SavedRecipe = { publicId: string };

type RecipeEditorProps = {
	onSave: (document: RecipeEditorDocument) => Promise<SavedRecipe>;
	onSaved?: (recipe: SavedRecipe) => void;
};

export function RecipeEditor({ onSave, onSaved }: RecipeEditorProps) {
	const [name, setName] = useState("");
	const [servings, setServings] = useState("2");
	const [ingredientText, setIngredientText] = useState("");
	const [preparationText, setPreparationText] = useState("");
	const [instructionText, setInstructionText] = useState("");
	const [note, setNote] = useState("");
	const [sourceUrl, setSourceUrl] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
	const [ingredients, setIngredients] = useState<RecipeEditorIngredientNode[]>(
		[],
	);
	const [newIngredientName, setNewIngredientName] = useState("");
	const [newIngredientAmount, setNewIngredientAmount] = useState("");
	const [newGroupName, setNewGroupName] = useState("");

	const preview = useMemo(
		() =>
			createRecipeEditorDocument({
				preparationText,
				instructionText,
			}),
		[preparationText, instructionText],
	);

	function addIngredient() {
		const name = newIngredientName.trim();

		if (name.length === 0) return;

		const item = createIngredientItem(
			crypto.randomUUID(),
			name,
			newIngredientAmount.trim(),
		);

		setIngredients((current) => [...current, item]);
		setNewIngredientName("");
		setNewIngredientAmount("");
		setSavedRecipeId(null);
	}

	function addGroup() {
		const groupName = newGroupName.trim();

		if (groupName.length === 0) return;

		setIngredients((current) => [
			...current,
			createIngredientGroup(crypto.randomUUID(), groupName),
		]);
		setNewGroupName("");
		setSavedRecipeId(null);
	}

	// Enter でフォーム全体が保存されないようにする。変換確定の Enter では追加しない。
	function handleEnterToAdd(action: () => void) {
		return (event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key !== "Enter") return;

			event.preventDefault();

			if (!event.nativeEvent.isComposing) {
				action();
			}
		};
	}

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setSavedRecipeId(null);

		if (hasEmptyIngredientGroup(ingredients)) {
			setErrorMessage(
				"材料のないグループがあります。材料を移すか、グループを削除してください。",
			);
			return;
		}

		setIsSaving(true);

		try {
			const document = {
				...createRecipeEditorDocument({
					name,
					servings: Number(servings),
					preparationText,
					instructionText,
					note,
					sourceUrl,
				}),
				ingredients,
			};

			const result = await onSave(document);
			setSavedRecipeId(result.publicId);
			onSaved?.(result);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "レシピを保存できませんでした",
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<section className={styles.container}>
			<h2 className={styles.title}>レシピを登録</h2>

			<form
				className={styles.form}
				onSubmit={(event) => void handleSubmit(event)}
			>
				<label className={styles.field}>
					<span>レシピ名</span>
					<input
						className={styles.input}
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</label>

				<label className={styles.field}>
					<span>何人分</span>
					<input
						className={styles.input}
						type="number"
						min="0.001"
						step="any"
						value={servings}
						onChange={(event) => setServings(event.target.value)}
						required
					/>
				</label>

				<label className={styles.field}>
					<span>材料</span>
					<textarea
						className={styles.textarea}
						value={ingredientText}
						onChange={(event) => setIngredientText(event.target.value)}
						placeholder={"肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個"}
					/>
				</label>
				<button
					type="button"
					onClick={() => {
						setIngredients(
							createRecipeEditorDocument({ ingredientText }).ingredients,
						);
						setSavedRecipeId(null);
					}}
				>
					材料を読み取る
				</button>
				<p>もう一度読み取ると、下の材料への修正は置き換わります。</p>

				<label className={styles.field}>
					<span>下準備</span>
					<textarea
						className={styles.textarea}
						value={preparationText}
						onChange={(event) => setPreparationText(event.target.value)}
						placeholder={"玉ねぎをみじん切りにする\n卵を溶いておく"}
					/>
				</label>

				<label className={styles.field}>
					<span>作り方</span>
					<textarea
						className={styles.textarea}
						value={instructionText}
						onChange={(event) => setInstructionText(event.target.value)}
						placeholder={"1. 材料を混ぜる\n2. フライパンで焼く"}
					/>
				</label>

				<label className={styles.field}>
					<span>メモ・人数変更時の注意</span>
					<textarea
						className={styles.textarea}
						value={note}
						onChange={(event) => setNote(event.target.value)}
					/>
				</label>

				<label className={styles.field}>
					<span>引用元URL（任意）</span>
					<input
						className={styles.input}
						type="url"
						inputMode="url"
						placeholder="https://"
						value={sourceUrl}
						onChange={(event) => setSourceUrl(event.target.value)}
					/>
				</label>

				<div className={styles.preview}>
					<h3>保存前の確認</h3>

					<h4>材料</h4>
					{ingredients.length === 0 ? <p>材料はまだありません。</p> : null}
					<ul className={styles.list}>
						{ingredients.map((node) => {
							const groups = listGroupOptions(ingredients);
							return (
								<IngredientPreviewNode
									key={node.id}
									node={node}
									onChange={(id, changes) => {
										setIngredients((current) =>
											updateIngredientItem(current, id, changes),
										);
										setSavedRecipeId(null);
									}}
									groups={groups}
									onMove={(id, targetGroupId) => {
										setIngredients((current) =>
											moveIngredientItem(current, id, targetGroupId),
										);
										setSavedRecipeId(null);
									}}
									onRenameGroup={(id, groupName) => {
										setIngredients((current) =>
											renameIngredientGroup(current, id, groupName),
										);
										setSavedRecipeId(null);
									}}
									onRemoveGroup={(id) => {
										setIngredients((current) =>
											removeEmptyIngredientGroup(current, id),
										);
										setSavedRecipeId(null);
									}}
									onRemove={(id) => {
										setIngredients(
											(current) => removeIngredientItem(current, id).remaining,
										);
										setSavedRecipeId(null);
									}}
								/>
							);
						})}
					</ul>

					<div className={styles.addIngredientRow}>
						<input
							className={styles.input}
							aria-label="追加する材料名"
							placeholder="材料名"
							value={newIngredientName}
							onChange={(event) => setNewIngredientName(event.target.value)}
							onKeyDown={handleEnterToAdd(addIngredient)}
						/>
						<input
							className={styles.input}
							aria-label="追加する材料の分量"
							placeholder="分量なし"
							value={newIngredientAmount}
							onChange={(event) => setNewIngredientAmount(event.target.value)}
							onKeyDown={handleEnterToAdd(addIngredient)}
						/>
						<button
							type="button"
							disabled={newIngredientName.trim().length === 0}
							onClick={addIngredient}
						>
							材料を追加
						</button>
					</div>

					<div className={styles.addGroupRow}>
						<input
							className={styles.input}
							aria-label="追加するグループ名"
							placeholder="グループ名"
							value={newGroupName}
							onChange={(event) => setNewGroupName(event.target.value)}
							onKeyDown={handleEnterToAdd(addGroup)}
						/>
						<button
							type="button"
							disabled={newGroupName.trim().length === 0}
							onClick={addGroup}
						>
							グループを追加
						</button>
					</div>

					<h4>下準備</h4>
					<ul className={styles.list}>
						{preview.preparations.map((preparation) => (
							<li key={preparation.id}>{preparation.text}</li>
						))}
					</ul>

					<h4>作り方</h4>
					<ol className={styles.list}>
						{preview.instructions.map((instruction) => (
							<li key={instruction.id}>{instruction.text}</li>
						))}
					</ol>
				</div>

				<button className={styles.saveButton} type="submit" disabled={isSaving}>
					{isSaving ? "保存しています…" : "レシピを保存"}
				</button>

				{errorMessage ? (
					<p role="alert" className={styles.error}>
						{errorMessage}
					</p>
				) : null}

				{savedRecipeId ? <output>レシピを保存しました。</output> : null}
			</form>
		</section>
	);
}
