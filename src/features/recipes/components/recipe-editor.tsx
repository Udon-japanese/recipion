import {
	type KeyboardEvent,
	type ReactNode,
	type SubmitEvent,
	useEffect,
	useEffectEvent,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Checkbox } from "#/components/checkbox/checkbox";
import { Field, TextInput } from "#/components/field/field";
import { Note } from "#/components/note/note";
import type { RecipeDetail } from "../application/recipe-repository";
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
import type {
	LinkableUser,
	OtherRecipeTarget,
} from "../domain/other-recipe-links";
import { parseRecipeIngredients } from "../domain/parse-recipe-ingredients";
import { parseRecipeInstructions } from "../domain/parse-recipe-instructions";
import { parseRecipePreparations } from "../domain/parse-recipe-preparations";
import {
	createRecipeEditorDocument,
	type RecipeEditorDocument,
	type RecipeEditorIngredientNode,
} from "../domain/recipe-editor-document";
import { findRecipeLimitViolation } from "../domain/recipe-limits";
import type { RecipeVisibility } from "../domain/recipe-link-permission";
import {
	extractLinkLabels,
	type RecipeLinkReference,
	type RecipeLinkTarget,
	type RecipeLinkView,
	stripLinkBrackets,
} from "../domain/recipe-links";
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
import { RecipeLinkPreview } from "./recipe-link-preview";
import { RecipeText } from "./recipe-text";
import { RecipeTitleInput } from "./recipe-title-input";
import type { LoadLinkedRecipes } from "./recipe-view-with-tree";
import { RecipeVisibilityField } from "./recipe-visibility-field";

type SavedRecipe = { publicId: string };

type RecipeEditorProps = {
	onSave: (document: RecipeEditorDocument) => Promise<SavedRecipe>;
	onSaved?: (recipe: SavedRecipe) => void;
	// 保存済みのレシピを編集するときの初期値。なければ、新規登録。
	initialDocument?: RecipeEditorDocument;
	// リンクできるレシピ（自分のレシピ。編集中のレシピ自身は、除く）を取ってくる。渡すと、リンクの入力（補完・ボタン）が使える。
	loadLinkTargets?: () => Promise<RecipeLinkTarget[]>;
	// 保存前の確認で、リンクを押したとき、リンク先のレシピのプレビューを開く（取ってくる方法と、「レシピを開く」のリンク）。
	loadLinkedRecipe?: (publicId: string) => Promise<RecipeDetail | null>;
	renderOpenLink?: (publicId: string) => ReactNode;
	// プレビューの中で、材料のリンク先を、まとめて取ってくる（材料の下に、その場で開く）。
	loadLinkedRecipes?: LoadLinkedRecipes;
	// 他の人のレシピへのリンク（[[@ユーザー/…）。ユーザーを探す／そのユーザーの全体公開レシピを取ってくる。
	searchLinkableUsers?: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes?: (handle: string) => Promise<OtherRecipeTarget[]>;
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
			: [stripLinkBrackets(node.name)],
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
	loadLinkTargets,
	loadLinkedRecipe,
	renderOpenLink,
	loadLinkedRecipes,
	searchLinkableUsers,
	loadUserRecipes,
}: RecipeEditorProps) {
	const templateCheckboxId = useId();
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
	const [visibility, setVisibility] = useState<RecipeVisibility>(
		initialDocument?.visibility ?? "private",
	);
	const [text, setText] = useState(initialState.text);
	const [sync, setSync] = useState(initialState.sync);
	const [useTemplate, setUseTemplate] = useState(true);
	const [activeTab, setActiveTab] = useState<ActiveTab>("input");
	const saveAction = useButtonAction();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
	const [newIngredientName, setNewIngredientName] = useState("");
	const [newIngredientAmount, setNewIngredientAmount] = useState("");
	const [newGroupName, setNewGroupName] = useState("");
	// 本文の [[ラベル]] が指すレシピ。本文から消えたラベルは、保存のときに捨てられる。
	const [links, setLinks] = useState<RecipeLinkReference[]>(
		initialDocument?.links ?? [],
	);
	const [linkTargets, setLinkTargets] = useState<readonly RecipeLinkTarget[]>(
		[],
	);
	const [linkTargetsStatus, setLinkTargetsStatus] = useState<
		"loading" | "ready" | "error"
	>("loading");

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
	// 本文に出てくるリンクのラベルと、リンク先の名前（未設定なら null。一覧にない相手は、ラベルのまま）。
	const linkedLabels = useMemo(
		() =>
			extractLinkLabels([text]).map((label) => {
				const link = links.find((existing) => existing.label === label);
				const target = link
					? linkTargets.find(
							(candidate) => candidate.publicId === link.targetPublicId,
						)
					: undefined;

				return {
					label,
					targetName: link ? (target?.name ?? label) : null,
				};
			}),
		[text, links, linkTargets],
	);
	// 保存前の確認で、リンクを、保存後と同じように表示するための、リンク先（リンク先を決めていないラベルは、含めない）。
	const linkViews = useMemo<RecipeLinkView[]>(
		() =>
			links.map((link) => ({
				label: link.label,
				target: {
					publicId: link.targetPublicId,
					name:
						linkTargets.find(
							(candidate) => candidate.publicId === link.targetPublicId,
						)?.name ?? link.label,
				},
			})),
		[links, linkTargets],
	);
	// 保存前の確認で、プレビューを開いているリンク先（閉じると、押したリンクに、フォーカスを戻す）。
	const [openedLinkPublicId, setOpenedLinkPublicId] = useState<string | null>(
		null,
	);
	const linkTriggerRef = useRef<HTMLElement | null>(null);
	const handleOpenLink =
		loadLinkedRecipe && renderOpenLink
			? (publicId: string, trigger: HTMLElement) => {
					linkTriggerRef.current = trigger;
					setOpenedLinkPublicId(publicId);
				}
			: undefined;
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

	// リンクできるレシピの一覧を、最初に1回、取ってくる。
	const loadTargets = useEffectEvent(() => {
		if (!loadLinkTargets) {
			return () => {};
		}

		let isCancelled = false;

		loadLinkTargets()
			.then((targets) => {
				if (!isCancelled) {
					setLinkTargets(targets);
					setLinkTargetsStatus("ready");
				}
			})
			.catch(() => {
				if (!isCancelled) {
					setLinkTargetsStatus("error");
				}
			});

		return () => {
			isCancelled = true;
		};
	});

	useEffect(() => loadTargets(), []);

	// リンクを、ラベルごとに1つだけ持つ（同じラベルは、入れ替える）。
	function handleLinkSelected(link: RecipeLinkReference) {
		setLinks((current) => [
			...current.filter((existing) => existing.label !== link.label),
			link,
		]);
		setSavedRecipeId(null);
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

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
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

		void saveAction.run(save);
	}

	async function save() {
		try {
			const document = {
				...createRecipeEditorDocument({
					name: title,
					servings: Number(servings),
					preparationText: sections.preparationText,
					instructionText: sections.instructionText,
					note: sections.note,
					sourceUrl,
					visibility,
					// 本文に出てくるラベルのリンクだけを送る（本文から消したリンクは、送らない）。
					links: links.filter((link) =>
						linkedLabels.some(({ label }) => label === link.label),
					),
				}),
				ingredients,
			};

			// 入力の上限を、保存の前に確かめる（サーバーでも、同じ上限で確かめる）。
			const limitViolation = findRecipeLimitViolation(document);

			if (limitViolation) {
				setErrorMessage(limitViolation);

				return false;
			}

			const result = await onSave(document);
			setSavedRecipeId(result.publicId);
			onSaved?.(result);

			return true;
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "レシピを保存できませんでした",
			);

			return false;
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.eyebrow}>
				{isEditing ? "レシピを編集" : "レシピを登録"}
			</h1>

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
					<div className={styles.metaField}>
						<Field label="何人分">
							{(control) => (
								<TextInput
									{...control}
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
							)}
						</Field>
					</div>

					<div className={styles.metaFieldWide}>
						<Field label="引用元URL（任意）">
							{(control) => (
								<TextInput
									{...control}
									type="url"
									inputMode="url"
									placeholder="https://"
									value={sourceUrl}
									onChange={(event) => setSourceUrl(event.target.value)}
									onKeyDown={preventSubmitOnEnter}
								/>
							)}
						</Field>
					</div>
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
							linkTargets={loadLinkTargets ? linkTargets : undefined}
							linkTargetsStatus={linkTargetsStatus}
							links={links}
							onLinkSelected={handleLinkSelected}
							searchLinkableUsers={
								loadLinkTargets ? searchLinkableUsers : undefined
							}
							loadUserRecipes={loadLinkTargets ? loadUserRecipes : undefined}
							placeholder={
								"＜材料＞\n豚ひき肉 200g\n玉ねぎ 1/2個\n\n＜作り方＞\n1. 材料を混ぜる\n2. フライパンで焼く"
							}
						/>

						{isEditing ? null : (
							<div className={styles.checkRow}>
								<Checkbox
									id={templateCheckboxId}
									label="新規登録で、見出しを最初から入れる"
									checked={useTemplate}
									onChange={(event) =>
										handleTemplateToggle(event.target.checked)
									}
								/>
								<label htmlFor={templateCheckboxId} aria-hidden="true">
									新規登録で、見出しを最初から入れる
								</label>
							</div>
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
									linkViews={linkViews}
									onOpenLink={handleOpenLink}
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
							<Button
								variant="secondary"
								size="sm"
								disabled={newIngredientName.trim().length === 0}
								onClick={addIngredient}
							>
								材料を追加
							</Button>
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
							<Button
								variant="secondary"
								size="sm"
								disabled={newGroupName.trim().length === 0}
								onClick={addGroup}
							>
								グループを追加
							</Button>
						</div>

						<h4>下準備</h4>
						<ul className={styles.list}>
							{preparations.map((preparation, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: 文章から作る表示用の一覧で、並びは入力順のまま。
								<li key={index}>
									<RecipeText
										text={preparation}
										linkViews={linkViews}
										onOpenLink={handleOpenLink}
									/>
								</li>
							))}
						</ul>

						<h4>作り方</h4>
						<ol className={styles.list}>
							{instructions.map((instruction, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: 文章から作る表示用の一覧で、並びは入力順のまま。
								<li key={index}>
									<RecipeText
										text={instruction}
										linkViews={linkViews}
										onOpenLink={handleOpenLink}
									/>
								</li>
							))}
						</ol>

						{sections.note === "" ? null : (
							<>
								<h4>メモ</h4>
								<p className={styles.note}>
									<RecipeText
										text={sections.note}
										linkViews={linkViews}
										onOpenLink={handleOpenLink}
									/>
								</p>
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

				<RecipeVisibilityField
					value={visibility}
					onChange={(next) => {
						setVisibility(next);
						setSavedRecipeId(null);
					}}
					hasSourceUrl={sourceUrl.trim() !== ""}
				/>

				<Button
					type="submit"
					size="lg"
					align="end"
					status={saveAction.status}
					pendingLabel="保存しています"
					successLabel="保存しました"
					errorLabel="保存できません"
				>
					レシピを保存
				</Button>

				{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}

				{savedRecipeId ? (
					<Note tone="success">レシピを保存しました。</Note>
				) : null}
			</form>

			{openedLinkPublicId !== null && loadLinkedRecipe && renderOpenLink ? (
				<RecipeLinkPreview
					initialPublicId={openedLinkPublicId}
					loadRecipe={loadLinkedRecipe}
					renderOpenLink={renderOpenLink}
					loadLinkedRecipes={loadLinkedRecipes}
					onClose={() => {
						setOpenedLinkPublicId(null);
						linkTriggerRef.current?.focus();
					}}
				/>
			) : null}
		</section>
	);
}
