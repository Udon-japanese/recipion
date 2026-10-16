import {
	type ChangeEvent,
	type KeyboardEvent,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { CompletionHint } from "#/components/completion-menu/completion-hint";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import {
	type CompletionLayout,
	useCompletionLayout,
} from "#/components/completion-menu/use-completion-layout";
import { describeError } from "#/errors/user-facing-error";
import type { CompositionStrategy } from "#/ime/choose-composition-strategy";
import { restoreFocus } from "#/ime/end-composition";
import { editKindOfInput, type TextSnapshot } from "#/ime/text-history";
import {
	type CommitContext,
	useCompositionCompletion,
} from "#/ime/use-composition-completion";
import { useTextHistory } from "#/ime/use-text-history";
import {
	continueRecipeList,
	removeRecipeListMarker,
} from "../domain/continue-recipe-list";
import {
	adjustCompletionItem,
	applyRecipeTextCompletion,
	getRecipeTextCompletion,
	type RecipeTextCompletion,
} from "../domain/get-recipe-text-completions";
import {
	getOpenLinkTyped,
	type LinkableUser,
	type OtherRecipeTarget,
	parseOtherLinkQuery,
} from "../domain/other-recipe-links";
import {
	formatLink,
	type RecipeLinkReference,
	type RecipeLinkTarget,
	resolveLinkLabel,
} from "../domain/recipe-links";
import {
	buildRecipeTips,
	formatRecipeTips,
	hasOnlyHeadings,
} from "../domain/recipe-tips";
import * as styles from "./recipe-editor.css";
import { RecipeLinkPicker } from "./recipe-link-picker";

type RecipeBodyTextareaProps = {
	value: string;
	onChange: (value: string) => void;
	// 作り方・下準備の中で補完する、材料名・グループ名。
	recipeNames: readonly string[];
	placeholder?: string;
	// 変換中の補完の方式（なければ、ブラウザから判定する）。テストで指定する。
	compositionStrategy?: CompositionStrategy;
	// 候補の出し方（なければ、タッチ操作の端末かどうかで決める）。テストで指定する。
	// caret：カーソルの近くに、縦の一覧。keyboard-bar：キーボードのすぐ上に、横に並べた帯。
	completionLayout?: CompletionLayout;
	// リンクできるレシピ（自分のレシピ）。渡すと、[[ の補完と、「現在の位置にレシピをリンク」のボタンが使える。
	linkTargets?: readonly RecipeLinkTarget[];
	linkTargetsStatus?: "loading" | "ready" | "error";
	// 本文で使っているラベルと、リンク先（同じラベルの重複を避けるため）。
	links?: readonly RecipeLinkReference[];
	// リンクを入れたとき（補完か、ボタンで）。
	onLinkSelected?: (link: RecipeLinkReference) => void;
	// 他の人のレシピへのリンク（[[@ユーザー/…）。ユーザーを探す／そのユーザーの全体公開レシピを取ってくる。渡すと、@ の補完と、ボタンの「他の人のレシピ」が使える。
	searchLinkableUsers?: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes?: (handle: string) => Promise<OtherRecipeTarget[]>;
	// 覚えている他の人のレシピの検索結果を捨てる（リンクを選ぶシートの「更新」）。
	onRefreshOthers?: () => void;
};

// レシピの本文の入力欄。入力欄の下に、補完の候補を出す。
// 候補は、↑↓ で選び、Tab（または、選んだあとの Enter）で決定する。選んでいないときの Enter は、ふつうの改行。Esc で閉じる。
export function RecipeBodyTextarea({
	value,
	onChange,
	recipeNames,
	placeholder,
	compositionStrategy,
	completionLayout,
	linkTargets,
	linkTargetsStatus,
	links,
	onLinkSelected,
	searchLinkableUsers,
	loadUserRecipes,
	onRefreshOthers,
}: RecipeBodyTextareaProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	// 元に戻す・やり直しの履歴（自前。買い物メモの「まとめて追加」と共通）。
	const history = useTextHistory({ textareaRef, restore: writeText });
	const caretRef = useRef(0);
	const [caret, setCaret] = useState(0);
	const [isFocused, setIsFocused] = useState(false);
	// 変換中（IME）の補完。レシピの本文と、買い物メモの「まとめて追加」で共通。
	const composing = useCompositionCompletion<RecipeTextCompletion>({
		textareaRef,
		strategy: compositionStrategy,
		apply: applyDuringComposition,
		onCompositionEnd: ({ before, after }) =>
			history.record(before, after, "other"),
	});
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// 「現在の位置にレシピをリンク」を押したときの、選択範囲（開いている間だけ持つ）。
	const [pickerSelection, setPickerSelection] = useState<{
		start: number;
		end: number;
	} | null>(null);
	const layout = useCompletionLayout(completionLayout);
	// 本文を書き換えたあとに、カーソルを置く位置。
	const [selectionRequest, setSelectionRequest] = useState<{
		caret: number;
	} | null>(null);
	// Esc で閉じた位置。本文かカーソルが動くまで、出さない。
	const [closedAt, setClosedAt] = useState<{
		value: string;
		caret: number;
	} | null>(null);

	// 他の人のレシピへのリンク（[[@…）の入力中の、サーバーから取ってきた候補。
	const [otherUsers, setOtherUsers] = useState<LinkableUser[]>([]);
	const [otherRecipes, setOtherRecipes] = useState<
		Record<string, OtherRecipeTarget[]>
	>({});
	const [isSearchingUsers, setIsSearchingUsers] = useState(false);
	const [otherError, setOtherError] = useState<string | null>(null);
	// 親の再描画で関数が替わっても、検索をやり直さない（最新の関数を、ここから呼ぶ）。
	const searchUsersRef = useRef(searchLinkableUsers);
	const loadUserRecipesRef = useRef(loadUserRecipes);
	searchUsersRef.current = searchLinkableUsers;
	loadUserRecipesRef.current = loadUserRecipes;
	const hasOtherLinks = Boolean(searchLinkableUsers || loadUserRecipes);
	const otherLinkQuery = (() => {
		if (!hasOtherLinks) {
			return null;
		}

		const typed = getOpenLinkTyped(value, caret);

		return typed === null ? null : parseOtherLinkQuery(typed);
	})();
	const usersQuery =
		otherLinkQuery?.stage === "users" ? otherLinkQuery.query : null;
	const recipesHandle =
		otherLinkQuery?.stage === "recipes" ? otherLinkQuery.handle : null;

	// ユーザーを探す（打ち終わるのを少し待ってから、サーバーに聞く）。
	useEffect(() => {
		if (usersQuery === null) {
			return;
		}

		let isCancelled = false;

		setIsSearchingUsers(true);

		const timer = window.setTimeout(() => {
			searchUsersRef
				.current?.(usersQuery)
				.then((users) => {
					if (!isCancelled) {
						setOtherUsers(users);
						setOtherError(null);
						setIsSearchingUsers(false);
					}
				})
				.catch((error: unknown) => {
					if (!isCancelled) {
						setOtherUsers([]);
						setOtherError(describeError(error, "ユーザーを探せませんでした。"));
						setIsSearchingUsers(false);
					}
				});
		}, 250);

		return () => {
			isCancelled = true;
			window.clearTimeout(timer);
		};
	}, [usersQuery]);

	// 選んだユーザーの、全体公開のレシピを取ってくる（覚えた結果は、期限まで使われる。控えは、エディタが持つ）。
	useEffect(() => {
		if (recipesHandle === null) {
			return;
		}

		loadUserRecipesRef
			.current?.(recipesHandle)
			.then((recipes) => {
				setOtherRecipes((current) => ({
					...current,
					[recipesHandle]: recipes,
				}));
				setOtherError(null);
			})
			.catch((error: unknown) => {
				// 取れなかったら、控えには残らないので、次の入力で、もう一度試される。
				setOtherError(describeError(error, "レシピを読み込めませんでした。"));
			});
	}, [recipesHandle]);

	const completion = useMemo(
		() =>
			getRecipeTextCompletion(value, caret, recipeNames, {
				targets: linkTargets ?? [],
				links: links ?? [],
				others: hasOtherLinks
					? { users: otherUsers, recipes: Object.values(otherRecipes).flat() }
					: undefined,
			}),
		[
			value,
			caret,
			recipeNames,
			linkTargets,
			links,
			otherUsers,
			otherRecipes,
			hasOtherLinks,
		],
	);
	// 変換中は、変換中の補完に対応した環境だけ、候補を出す（ほかは、確定したあとに出す）。
	const isOpen =
		isFocused &&
		composing.canCompleteWhileComposing &&
		completion !== null &&
		!(closedAt?.value === value && closedAt.caret === caret);
	// 候補がないとき（[[@ で、探している最中・見つからない・失敗）は、その理由を、補完のメニューの中に出す。
	const otherNotice =
		!completion && otherLinkQuery
			? (otherError ??
				(otherLinkQuery.stage === "users"
					? isSearchingUsers
						? "ユーザーを探しています…"
						: "全体公開のレシピがある人が、見つかりません。自分のレシピは、@ を付けずに [[ だけで選べます。"
					: otherRecipes[otherLinkQuery.handle] === undefined
						? "レシピを読み込んでいます…"
						: "公開されているレシピが、見つかりません。"))
			: null;
	const isNoticeOpen =
		isFocused &&
		otherNotice !== null &&
		composing.canCompleteWhileComposing &&
		!(closedAt?.value === value && closedAt.caret === caret);
	const isMenuOpen = isOpen || isNoticeOpen;

	// 案内（Tips）。空のときは、placeholder の下にまとめて書く。見出しだけの雛形のあいだは、フォーカスする前だけ、入力欄の下に重ねて出す。
	const tipsText = formatRecipeTips(
		buildRecipeTips({
			canLinkOwn: Boolean(linkTargets),
			canLinkOthers: hasOtherLinks,
		}),
	);
	const isShowingTips = !isFocused && hasOnlyHeadings(value);

	// 本文を書き換えたあと、本文が更新されてから、カーソルを置く。
	useLayoutEffect(() => {
		if (selectionRequest !== null && textareaRef.current) {
			textareaRef.current.setSelectionRange(
				selectionRequest.caret,
				selectionRequest.caret,
			);
		}
	}, [selectionRequest]);

	// 番号・中黒の印の直後の Backspace は、印を一度に消す（スマホのキーボードでも届くよう、入力の直前のイベントで扱う）。
	const handleHistoryInput = useEffectEvent((event: InputEvent) => {
		if (event.inputType === "deleteContentBackward") {
			const textarea = textareaRef.current;

			if (!textarea || event.isComposing || composing.isActive()) {
				return;
			}

			const result = removeRecipeListMarker(
				textarea.value,
				textarea.selectionStart,
				textarea.selectionEnd,
			);

			if (result) {
				event.preventDefault();
				edit({ text: result.text, caret: result.caret });
			}
		}
	});

	useEffect(() => {
		const textarea = textareaRef.current;

		if (!textarea) {
			return;
		}

		function listener(event: InputEvent) {
			handleHistoryInput(event);
		}

		textarea.addEventListener("beforeinput", listener);

		return () => textarea.removeEventListener("beforeinput", listener);
	}, []);

	function syncCaret(textarea: HTMLTextAreaElement) {
		const position = composing.readCaret(textarea);

		// カーソルが動いていない通知（キーを押しただけでも届く）では、候補の選択を解除しない。
		if (position !== caretRef.current) {
			setActiveIndex(null);
		}

		caretRef.current = position;
		setCaret(position);
	}

	// 本文を書き換える（履歴の記録は、呼び出し側で行う）。
	function writeText(next: TextSnapshot) {
		caretRef.current = next.caret;
		onChange(next.text);
		setSelectionRequest({ caret: next.caret });
		setCaret(next.caret);
		setActiveIndex(null);
	}

	// 補完や番号の自動入力による編集。1回で元に戻せるよう、履歴に記録する。
	function edit(next: TextSnapshot) {
		const textarea = textareaRef.current;

		history.record(
			{
				text: value,
				caret: textarea?.selectionStart ?? caretRef.current,
			},
			next,
			"other",
		);
		writeText(next);
	}

	function accept(index: number) {
		if (!completion) {
			return;
		}

		const result = applyRecipeTextCompletion(value, completion, index);
		const link = completion.items[index]?.link;

		edit({ text: result.text, caret: result.caret });

		if (link) {
			onLinkSelected?.(link);
		}
	}

	// 「現在の位置にレシピをリンク」。ボタンを押す前のカーソルの位置（選択があれば、その範囲）に、[[名前]] を入れる。
	function insertLink(target: RecipeLinkTarget) {
		const textarea = textareaRef.current;
		const selection = pickerSelection;

		if (!selection) {
			return;
		}

		const label = resolveLinkLabel(target.name, target.publicId, links ?? []);
		const inserted = formatLink(label);
		const next = {
			text: `${value.slice(0, selection.start)}${inserted}${value.slice(selection.end)}`,
			caret: selection.start + inserted.length,
		};

		edit(next);
		onLinkSelected?.({ label, targetPublicId: target.publicId });
		setPickerSelection(null);

		if (textarea) {
			restoreFocus(textarea, next.caret);
		}
	}

	// 変換中に決めた候補で、本文を書き換える（変換の中身の扱いは、useCompositionCompletion）。
	// source は、候補を計算したときの本文とカーソル（変換で長さが変わった分を、置き換える範囲に反映する。元に戻すで、この状態に戻る）。
	function applyDuringComposition(
		completion: RecipeTextCompletion,
		index: number,
		{ composition, source, committed, shouldEnd }: CommitContext,
	): TextSnapshot {
		const item = completion.items[index];
		const result = applyRecipeTextCompletion(
			committed.text,
			{
				items: [
					adjustCompletionItem(item, {
						start: composition.start,
						delta: committed.text.length - source.text.length,
					}),
				],
			},
			0,
		);
		const next = { text: result.text, caret: result.caret };

		// 変換中の文字（「とま」）の段階を、履歴に残す。Safari は、確定を待たずに置き換えるので、候補を計算したときの本文を使う（Tab で IME が先に変換した文字ではなく）。
		const middle = shouldEnd ? committed : source;

		history.record(composition.before, middle, "other");
		history.record(middle, next, "other");
		writeText(next);

		if (item.link) {
			onLinkSelected?.(item.link);
		}

		return next;
	}

	// 番号・中黒の行で Enter を押したら、次の行にも印を付ける（Shift+Enter は、ふつうの改行）。
	function continueList(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (
			event.key !== "Enter" ||
			event.shiftKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.nativeEvent.isComposing
		) {
			return;
		}

		const textarea = event.currentTarget;
		const result = continueRecipeList(
			value,
			textarea.selectionStart,
			textarea.selectionEnd,
		);

		if (!result) {
			return;
		}

		event.preventDefault();
		edit({ text: result.text, caret: result.caret });
	}

	// 候補の選択を、1つ動かす（現在の選択がなければ、↓は先頭、↑は末尾）。端までいくと、反対側へ回る（押し続けると、循環する）。
	function moveActive(direction: "up" | "down", itemCount: number) {
		setActiveIndex((current) => {
			if (direction === "down") {
				return current === null ? 0 : (current + 1) % itemCount;
			}

			return current === null
				? itemCount - 1
				: (current - 1 + itemCount) % itemCount;
		});
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// 変換中の操作は、IME に任せる。ただし、候補が出ているときは、Tab と Alt+↑↓ を、補完に使う。
		if (
			composing.handleKeyDown(event, {
				shown:
					isOpen && completion
						? {
								completion,
								count: completion.items.length,
								text: value,
								caret,
							}
						: null,
				activeIndex,
				moveActive: (direction) =>
					moveActive(direction, completion?.items.length ?? 0),
			})
		) {
			return;
		}

		// 元に戻す・やり直す（Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y）は、自前の履歴で行う。
		if (history.handleKeyDown(event)) {
			return;
		}

		if (!isOpen || !completion) {
			continueList(event);

			return;
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				moveActive("down", completion.items.length);
				break;
			case "ArrowUp":
				event.preventDefault();
				moveActive("up", completion.items.length);
				break;
			case "Tab":
				event.preventDefault();
				accept(activeIndex ?? 0);
				break;
			case "Enter":
				if (activeIndex !== null) {
					event.preventDefault();
					accept(activeIndex);
				} else {
					continueList(event);
				}
				break;
			case "Escape":
				event.preventDefault();
				setClosedAt({ value, caret });
				break;
		}
	}

	function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
		const textarea = event.target;

		// 変換中の入力は、変換が終わったときに、まとめて記録する。
		if (
			!composing.noteChange(
				isOpen && completion
					? {
							completion,
							count: completion.items.length,
							text: value,
							caret,
						}
					: null,
			)
		) {
			history.record(
				{ text: value, caret: caretRef.current },
				{ text: textarea.value, caret: textarea.selectionStart },
				editKindOfInput((event.nativeEvent as InputEvent).inputType),
			);
		}

		onChange(textarea.value);
		// 本文が変わると、候補も変わるので、選択を解除する。
		setActiveIndex(null);
		syncCaret(textarea);
	}

	return (
		<div className={styles.completionWrap}>
			<label className={styles.field}>
				<span>レシピの本文</span>
				<span className={styles.textareaFrame}>
					<textarea
						ref={textareaRef}
						className={styles.bodyTextarea}
						value={value}
						placeholder={
							placeholder ? `${placeholder}\n\n${tipsText}` : tipsText
						}
						onChange={handleChange}
						onSelect={(event) => syncCaret(event.currentTarget)}
						onKeyDown={handleKeyDown}
						onCompositionStart={composing.onCompositionStart}
						onCompositionEnd={composing.onCompositionEnd}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
					/>
					{isShowingTips ? (
						<span className={styles.bodyTips} aria-hidden="true">
							{tipsText}
						</span>
					) : null}
				</span>
			</label>

			{linkTargets ? (
				<div>
					<button
						type="button"
						className={styles.insertRecipeLinkButton}
						onClick={() => {
							const textarea = textareaRef.current;

							setPickerSelection({
								start: textarea?.selectionStart ?? value.length,
								end: textarea?.selectionEnd ?? value.length,
							});
						}}
					>
						現在の位置にレシピをリンク
					</button>
				</div>
			) : null}

			{pickerSelection && linkTargets ? (
				<RecipeLinkPicker
					title="リンクするレシピを選ぶ"
					targets={linkTargets}
					status={linkTargetsStatus ?? "ready"}
					onSelect={insertLink}
					onClose={() => setPickerSelection(null)}
					searchUsers={searchLinkableUsers}
					loadUserRecipes={loadUserRecipes}
					onRefresh={onRefreshOthers}
				/>
			) : null}

			<CompletionMenu
				textareaRef={textareaRef}
				layout={layout}
				open={isMenuOpen}
				caret={caret}
				items={
					completion
						? completion.items.map((item) => ({
								key: item.label,
								label: item.label,
							}))
						: null
				}
				activeIndex={activeIndex}
				onAccept={(index) => {
					if (!completion?.items[index]) {
						return;
					}

					// 変換中は、変換を確定させてから置き換える。
					if (composing.isActive()) {
						void composing.accept(completion, index, { text: value, caret });
					} else {
						accept(index);
					}
				}}
				notice={otherNotice}
				// 変換中・確定の直後は、IME の窓（文字の下に出る）を避けて、カーソルの上に出す。
				prefer={composing.prefersAbove(value, caret) ? "above" : "below"}
				hint={<CompletionHint isComposing={composing.isComposing} />}
			/>
		</div>
	);
}
