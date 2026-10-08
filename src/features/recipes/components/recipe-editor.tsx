import {
	type KeyboardEvent,
	type SubmitEvent,
	useEffect,
	useEffectEvent,
	useMemo,
	useState,
} from "react";
import {
	createIngredientGroup,
	createIngredientItem,
	hasEmptyIngredientGroup,
	moveIngredientItem,
	removeEmptyIngredientGroup,
	removeIngredientItem,
	renameIngredientGroup,
	updateIngredientItem,
} from "../domain/edit-recipe-ingredients";
import {
	formatRecipeEditorText,
	formatRecipeTemplateText,
} from "../domain/format-recipe-editor-text";
import { parseRecipeIngredients } from "../domain/parse-recipe-ingredients";
import { parseRecipeInstructions } from "../domain/parse-recipe-instructions";
import { parseRecipePreparations } from "../domain/parse-recipe-preparations";
import {
	createRecipeEditorDocument,
	type RecipeEditorDocument,
	type RecipeEditorIngredientNode,
} from "../domain/recipe-editor-document";
import {
	createIngredientSyncState,
	emptyIngredientSyncState,
	type IngredientSyncState,
	normalizeGroupName,
	reconcileRecipeIngredients,
} from "../domain/reconcile-recipe-ingredients";
import { splitRecipeSections } from "../domain/split-recipe-sections";
import {
	readTemplatePreference,
	writeTemplatePreference,
} from "../infrastructure/recipe-editor-preferences";
import { RecipeBodyTextarea } from "./recipe-body-textarea";
import * as styles from "./recipe-editor.css";
import {
	IngredientPreviewNode,
	listGroupOptions,
	preventSubmitOnEnter,
} from "./recipe-ingredient-preview";
import { RecipeTitleInput } from "./recipe-title-input";

type SavedRecipe = { publicId: string };

type RecipeEditorProps = {
	onSave: (document: RecipeEditorDocument) => Promise<SavedRecipe>;
	onSaved?: (recipe: SavedRecipe) => void;
	// 保存済みのレシピを編集するときの初期値。なければ、新規登録。
	initialDocument?: RecipeEditorDocument;
};

type ActiveTab = "input" | "preview";

function reconcileFromText(
	sync: IngredientSyncState,
	text: string,
): IngredientSyncState {
	return reconcileRecipeIngredients(
		sync,
		parseRecipeIngredients(splitRecipeSections(text).ingredientText),
	);
}

// 作り方・下準備の補完に使う、材料名とグループ名。
function collectRecipeNames(
	nodes: readonly RecipeEditorIngredientNode[],
): string[] {
	return nodes.flatMap((node) =>
		node.type === "group"
			? [normalizeGroupName(node.name), ...collectRecipeNames(node.children)]
			: [node.name],
	);
}

function createInitialState(
	initialDocument: RecipeEditorDocument | undefined,
): {
	text: string;
	sync: IngredientSyncState;
} {
	// 新規登録は、サーバーとブラウザで同じ表示になるよう、雛形ありで始める。端末に保存した設定は、表示のあとに反映する。
	if (!initialDocument) {
		const text = formatRecipeTemplateText();

		return { text, sync: reconcileFromText(emptyIngredientSyncState, text) };
	}

	const text = formatRecipeEditorText(initialDocument);

	return {
		text,
		sync: reconcileFromText(
			createIngredientSyncState(initialDocument.ingredients),
			text,
		),
	};
}

export function RecipeEditor({
	onSave,
	onSaved,
	initialDocument,
}: RecipeEditorProps) {
	const isEditing = initialDocument !== undefined;
	const [initialState] = useState(() => createInitialState(initialDocument));
	const [title, setTitle] = useState(initialDocument?.name ?? "");
	const [isTitleEditing, setIsTitleEditing] = useState(false);
	const [servings, setServings] = useState(
		String(initialDocument?.servings ?? 2),
	);
	// 見出しの「材料（2人分）」から人数を入れるのは、人数を自分で触るまで。
	const [isServingsTouched, setIsServingsTouched] = useState(isEditing);
	const [sourceUrl, setSourceUrl] = useState(initialDocument?.sourceUrl ?? "");
	const [text, setText] = useState(initialState.text);
	const [sync, setSync] = useState(initialState.sync);
	const [useTemplate, setUseTemplate] = useState(true);
	const [activeTab, setActiveTab] = useState<ActiveTab>("input");
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
	const [newIngredientName, setNewIngredientName] = useState("");
	const [newIngredientAmount, setNewIngredientAmount] = useState("");
	const [newGroupName, setNewGroupName] = useState("");

	const sections = useMemo(() => splitRecipeSections(text), [text]);
	const preparations = useMemo(
		() => parseRecipePreparations(sections.preparationText),
		[sections.preparationText],
	);
	const instructions = useMemo(
		() => parseRecipeInstructions(sections.instructionText),
		[sections.instructionText],
	);
	const ingredients = sync.nodes;
	const groups = listGroupOptions(ingredients);
	const recipeNames = useMemo(
		() => collectRecipeNames(ingredients),
		[ingredients],
	);

	function applyText(nextText: string) {
		setText(nextText);
		setSync((current) => reconcileFromText(current, nextText));
		setSavedRecipeId(null);

		const nextServings = splitRecipeSections(nextText).servings;

		if (nextServings !== null && !isServingsTouched) {
			setServings(String(nextServings));
		}
	}

	// 入力欄が、空か、雛形のままのときだけ、雛形を入れ替える（書いた文章は、消さない）。
	function handleTemplateToggle(enabled: boolean) {
		setUseTemplate(enabled);
		writeTemplatePreference(enabled);

		const template = formatRecipeTemplateText();

		if (text.trim() === "" || text === template) {
			applyText(enabled ? template : "");
		}
	}

	// 端末に保存した「雛形なし」の設定を、表示のあとに反映する（localStorage は、サーバーでは読めない）。
	const applySavedTemplatePreference = useEffectEvent(() => {
		if (!isEditing && !readTemplatePreference()) {
			handleTemplateToggle(false);
		}
	});

	useEffect(() => {
		applySavedTemplatePreference();
	}, []);

	// プレビューでの手直し。手直しした ID を記録して、入力欄の文章を書き換えても、消さないようにする。
	function editIngredients(
		update: (
			nodes: RecipeEditorIngredientNode[],
		) => RecipeEditorIngredientNode[],
		editedId?: string,
	) {
		setSync((current) => ({
			...current,
			nodes: update(current.nodes),
			edited: editedId
				? new Set([...current.edited, editedId])
				: current.edited,
		}));
		setSavedRecipeId(null);
	}

	// 元の行が文章に残っていても、解析し直したときに出さないよう、消した行を覚える。
	function dismissSource(current: IngredientSyncState, id: string): string[] {
		const source = current.sources.get(id);

		return source === undefined
			? [...current.dismissed]
			: [...current.dismissed, source];
	}

	function removeIngredient(id: string) {
		setSync((current) => ({
			...current,
			nodes: removeIngredientItem(current.nodes, id).remaining,
			dismissed: dismissSource(current, id),
		}));
		setSavedRecipeId(null);
	}

	function removeGroup(id: string) {
		setSync((current) => ({
			...current,
			nodes: removeEmptyIngredientGroup(current.nodes, id),
			dismissed: dismissSource(current, id),
		}));
		setSavedRecipeId(null);
	}

	// 手直しを元に戻す。解析し直して、元の行の内容（と、元のグループ）に戻す。
	function revertEdit(id: string) {
		setSync((current) =>
			reconcileFromText(
				{
					...current,
					edited: new Set(
						[...current.edited].filter((editedId) => editedId !== id),
					),
				},
				text,
			),
		);
		setSavedRecipeId(null);
	}

	function addIngredient() {
		const name = newIngredientName.trim();

		if (name.length === 0) return;

		const item = createIngredientItem(
			crypto.randomUUID(),
			name,
			newIngredientAmount.trim(),
		);

		editIngredients((current) => [...current, item]);
		setNewIngredientName("");
		setNewIngredientAmount("");
	}

	function addGroup() {
		const groupName = newGroupName.trim();

		if (groupName.length === 0) return;

		editIngredients((current) => [
			...current,
			createIngredientGroup(crypto.randomUUID(), groupName),
		]);
		setNewGroupName("");
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

		if (title.trim() === "") {
			setErrorMessage("レシピ名を入力してください。");
			setIsTitleEditing(true);
			return;
		}

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
					name: title,
					servings: Number(servings),
					preparationText: sections.preparationText,
					instructionText: sections.instructionText,
					note: sections.note,
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
			<p className={styles.eyebrow}>
				{isEditing ? "レシピを編集" : "レシピを登録"}
			</p>

			<form
				className={styles.form}
				onSubmit={(event) => void handleSubmit(event)}
			>
				<RecipeTitleInput
					value={title}
					onChange={(value) => {
						setTitle(value);
						setSavedRecipeId(null);
					}}
					isEditing={isTitleEditing}
					onEditingChange={setIsTitleEditing}
				/>

				<div className={styles.metaRow}>
					<label className={styles.metaField}>
						<span>何人分</span>
						<input
							className={styles.input}
							type="number"
							min="0.001"
							step="any"
							value={servings}
							onChange={(event) => {
								setServings(event.target.value);
								setIsServingsTouched(true);
							}}
							onKeyDown={preventSubmitOnEnter}
							required
						/>
					</label>

					<label className={styles.metaFieldWide}>
						<span>引用元URL（任意）</span>
						<input
							className={styles.input}
							type="url"
							inputMode="url"
							placeholder="https://"
							value={sourceUrl}
							onChange={(event) => setSourceUrl(event.target.value)}
							onKeyDown={preventSubmitOnEnter}
						/>
					</label>
				</div>

				<div
					className={styles.tabList}
					role="tablist"
					aria-label="表示の切り替え"
				>
					<button
						className={styles.tab}
						type="button"
						role="tab"
						id="recipe-editor-tab-input"
						aria-selected={activeTab === "input"}
						aria-controls="recipe-editor-panel-input"
						onClick={() => setActiveTab("input")}
					>
						入力
					</button>
					<button
						className={styles.tab}
						type="button"
						role="tab"
						id="recipe-editor-tab-preview"
						aria-selected={activeTab === "preview"}
						aria-controls="recipe-editor-panel-preview"
						onClick={() => setActiveTab("preview")}
					>
						プレビュー
					</button>
				</div>

				<div className={styles.panes}>
					<div
						className={styles.pane}
						id="recipe-editor-panel-input"
						role="tabpanel"
						aria-labelledby="recipe-editor-tab-input"
						data-active={activeTab === "input"}
					>
						<RecipeBodyTextarea
							value={text}
							onChange={applyText}
							recipeNames={recipeNames}
							placeholder={
								"＜材料＞\n豚ひき肉 200g\n玉ねぎ 1/2個\n\n＜作り方＞\n1. 材料を混ぜる\n2. フライパンで焼く"
							}
						/>

						{isEditing ? null : (
							<label className={styles.checkRow}>
								<input
									type="checkbox"
									checked={useTemplate}
									onChange={(event) =>
										handleTemplateToggle(event.target.checked)
									}
								/>
								新規登録で、見出しを最初から入れる
							</label>
						)}

						<p className={styles.hint}>
							＜材料＞＜下準備＞＜作り方＞＜メモ＞の見出しで区切ります。見出しがなければ、空行で区切った文章の内容から、材料と作り方を判別します。
						</p>
					</div>

					<div
						className={styles.preview}
						id="recipe-editor-panel-preview"
						role="tabpanel"
						aria-labelledby="recipe-editor-tab-preview"
						data-active={activeTab === "preview"}
					>
						<h3>保存前の確認</h3>

						<h4>材料</h4>
						{ingredients.length === 0 ? <p>材料はまだありません。</p> : null}
						<ul className={styles.list}>
							{ingredients.map((node) => (
								<IngredientPreviewNode
									key={node.id}
									node={node}
									groups={groups}
									editedIds={sync.edited}
									onChange={(id, changes) =>
										editIngredients(
											(current) => updateIngredientItem(current, id, changes),
											id,
										)
									}
									onMove={(id, targetGroupId) =>
										editIngredients(
											(current) =>
												moveIngredientItem(current, id, targetGroupId),
											id,
										)
									}
									onRenameGroup={(id, groupName) =>
										editIngredients(
											(current) =>
												renameIngredientGroup(current, id, groupName),
											id,
										)
									}
									onRemoveGroup={removeGroup}
									onRemove={removeIngredient}
									onRevert={revertEdit}
								/>
							))}
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
							{preparations.map((preparation, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: 文章から作る表示用の一覧で、並びは入力順のまま。
								<li key={index}>{preparation}</li>
							))}
						</ul>

						<h4>作り方</h4>
						<ol className={styles.list}>
							{instructions.map((instruction, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: 文章から作る表示用の一覧で、並びは入力順のまま。
								<li key={index}>{instruction}</li>
							))}
						</ol>

						{sections.note === "" ? null : (
							<>
								<h4>メモ</h4>
								<p className={styles.note}>{sections.note}</p>
							</>
						)}

						{sections.unclassifiedBlocks.length > 0 ? (
							<div className={styles.unclassified}>
								<h4>分類できなかった文章</h4>
								<p>
									見出し（＜材料＞＜作り方＞など）を付けると、保存されます。いまは、保存されません。
								</p>
								{sections.unclassifiedBlocks.map((block) => (
									<p className={styles.note} key={block}>
										{block}
									</p>
								))}
							</div>
						) : null}
					</div>
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
