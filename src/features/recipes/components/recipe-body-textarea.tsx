import {
	type ChangeEvent,
	type CompositionEvent,
	type KeyboardEvent,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { describeError } from "#/errors/user-facing-error";
import { ShortcutKeys } from "#/features/shortcuts/components/shortcut-keys";
import {
	type CompositionStrategy,
	chooseCompositionStrategy,
} from "../domain/choose-composition-strategy";
import {
	continueRecipeList,
	removeRecipeListMarker,
} from "../domain/continue-recipe-list";
import {
	adjustCompletionItem,
	applyRecipeTextCompletion,
	getRecipeTextCompletion,
	type RecipeTextCompletion,
	type RecipeTextCompletionItem,
} from "../domain/get-recipe-text-completions";
import {
	getOpenLinkTyped,
	type LinkableUser,
	type OtherRecipeTarget,
	parseOtherLinkQuery,
} from "../domain/other-recipe-links";
import { placePopup } from "../domain/place-popup";
import {
	formatLink,
	type RecipeLinkReference,
	type RecipeLinkTarget,
	resolveLinkLabel,
} from "../domain/recipe-links";
import {
	type EditKind,
	editKindOfInput,
	emptyTextHistory,
	recordEdit,
	redoEdit,
	type TextSnapshot,
	undoEdit,
} from "../domain/text-history";
import {
	endComposition,
	restoreFocus,
} from "../infrastructure/end-composition";
import { measureTextareaCaret } from "../infrastructure/measure-textarea-caret";
import { readBrowserEnvironment } from "../infrastructure/read-browser-environment";
import * as styles from "./recipe-editor.css";
import { RecipeLinkPicker } from "./recipe-link-picker";

// Safari で、IME の変換と Tab のキーのイベントが、続けて届くとみなす時間（ミリ秒）。
const previousCompletionWindowMs = 100;

// 変換中（IME の入力中）の、変換の前の状態と、変換が始まった位置。
type Composition = { before: TextSnapshot; start: number };

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
};

type CompletionLayout = "caret" | "keyboard-bar";

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
}: RecipeBodyTextareaProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	// 元に戻す・やり直しの履歴。本文は、値として書き換える（ブラウザの履歴は、使えなくなる）ので、すべて自前で記録する。
	const historyRef = useRef(emptyTextHistory);
	const caretRef = useRef(0);
	const compositionRef = useRef<Composition | null>(null);
	// 変換中に候補を決める処理の間は、変換の終わりを、ここでは記録しない。
	const isAcceptingRef = useRef(false);
	// 変換中の入力の直前に出ていた候補。Safari は、Tab の前に IME が変換して本文が変わってから、キーのイベントが届くので、そのときに使う。
	const previousCompletionRef = useRef<{
		completion: RecipeTextCompletion;
		value: string;
		caret: number;
		at: number;
	} | null>(null);
	const [caret, setCaret] = useState(0);
	const [isFocused, setIsFocused] = useState(false);
	// IME の変換中か。
	const [isComposing, setIsComposing] = useState(false);
	// 変換中の補完の扱い。サーバーと同じ初期値で描画し、ブラウザで判定する。
	const [detectedStrategy, setDetectedStrategy] = useState<CompositionStrategy>(
		"wait-for-confirmation",
	);
	const strategy = compositionStrategy ?? detectedStrategy;
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// 「現在の位置にレシピをリンク」を押したときの、選択範囲（開いている間だけ持つ）。
	const [pickerSelection, setPickerSelection] = useState<{
		start: number;
		end: number;
	} | null>(null);
	// タッチ操作が主な端末か（サーバーでは判定できないので、ブラウザで判定する）。
	const [isTouch, setIsTouch] = useState(false);
	const layout: CompletionLayout =
		completionLayout ?? (isTouch ? "keyboard-bar" : "caret");
	// カーソルの近くに出す候補の位置（入力欄を含む枠の左上が基準）。測るまでは、見せない。
	const [popupPosition, setPopupPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	// 入力欄をスクロールしたとき、候補の位置を測り直す合図。
	const [scrollTick, setScrollTick] = useState(0);
	// キーボードを除いた見える範囲の下端から、画面の下端までの高さ（キーボードの上に出す帯の位置）。
	const [barBottom, setBarBottom] = useState(0);
	// 本文を書き換えたあとに、カーソルを置く位置。
	const [selectionRequest, setSelectionRequest] = useState<{
		caret: number;
	} | null>(null);
	// 変換が確定した位置（確定のあと、本文かカーソルが動くまで、メニューの位置を動かさない）。
	const [aboveUntilChange, setAboveUntilChange] = useState<{
		value: string;
		caret: number;
	} | null>(null);
	// Esc で閉じた位置。本文かカーソルが動くまで、出さない。
	const [closedAt, setClosedAt] = useState<{
		value: string;
		caret: number;
	} | null>(null);

	useEffect(() => {
		setDetectedStrategy(chooseCompositionStrategy(readBrowserEnvironment()));
	}, []);

	useEffect(() => {
		// matchMedia がない環境（テストなど）では、PC として扱う。
		if (typeof window.matchMedia !== "function") {
			return;
		}

		const query = window.matchMedia("(pointer: coarse)");

		function update() {
			setIsTouch(query.matches);
		}

		update();
		query.addEventListener("change", update);

		return () => query.removeEventListener("change", update);
	}, []);

	// 他の人のレシピへのリンク（[[@…）の入力中の、サーバーから取ってきた候補。
	const [otherUsers, setOtherUsers] = useState<LinkableUser[]>([]);
	const [otherRecipes, setOtherRecipes] = useState<
		Record<string, OtherRecipeTarget[]>
	>({});
	const [isSearchingUsers, setIsSearchingUsers] = useState(false);
	const [otherError, setOtherError] = useState<string | null>(null);
	const requestedHandlesRef = useRef(new Set<string>());
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

	// 選んだユーザーの、全体公開のレシピを取ってくる（同じユーザーは、1度だけ）。
	useEffect(() => {
		if (
			recipesHandle === null ||
			requestedHandlesRef.current.has(recipesHandle)
		) {
			return;
		}

		requestedHandlesRef.current.add(recipesHandle);

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
				// 取れなかったら、次の入力で、もう一度試せるようにする。
				requestedHandlesRef.current.delete(recipesHandle);
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
		(!isComposing || strategy !== "wait-for-confirmation") &&
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
		(!isComposing || strategy !== "wait-for-confirmation") &&
		!(closedAt?.value === value && closedAt.caret === caret);
	const isMenuOpen = isOpen || isNoticeOpen;
	// 変換の確定のあと、本文とカーソルが動くまでは、メニューを、確定の前の位置（カーソルの上）に置いたままにする。
	// 確定でメニューが下に移ると、その直後に届くクリックが、移った先に当たってしまうため。
	const keepAbove =
		aboveUntilChange?.value === value && aboveUntilChange.caret === caret;

	// カーソルの近くに出す候補の位置を決める。入力中の行には重ねない。変換中は、IME 自身の変換候補の窓（文字の下に出る）と重ならないよう、上を先にする。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 本文・カーソル・候補・スクロールが変わったときに、測り直す。
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		const popup = popupRef.current;
		const wrapper = wrapperRef.current;

		if (!isMenuOpen || layout !== "caret" || !textarea || !popup || !wrapper) {
			setPopupPosition(null);

			return;
		}

		const measured = measureTextareaCaret(textarea, caret);
		const box = textarea.getBoundingClientRect();
		// カーソルが、スクロールで入力欄の外に出ているときは、入力欄の端に寄せる。
		const caretTop = Math.min(
			Math.max(box.top + measured.top, box.top),
			box.bottom - measured.height,
		);
		const placed = placePopup({
			caret: {
				top: caretTop,
				left: box.left + measured.left,
				height: measured.height,
			},
			popup: { width: popup.offsetWidth, height: popup.offsetHeight },
			viewport: { width: window.innerWidth, height: window.innerHeight },
			prefer: isComposing || keepAbove ? "above" : "below",
		});
		const frame = wrapper.getBoundingClientRect();

		setPopupPosition({
			top: placed.top - frame.top,
			left: placed.left - frame.left,
		});
	}, [
		isMenuOpen,
		layout,
		caret,
		value,
		isComposing,
		keepAbove,
		completion,
		otherNotice,
		scrollTick,
	]);

	// キーボードのすぐ上に出す帯の位置。キーボードを除いた見える範囲（visualViewport）の下端に合わせる。
	useEffect(() => {
		if (!isMenuOpen || layout !== "keyboard-bar") {
			return;
		}

		const viewport = window.visualViewport;

		function update() {
			setBarBottom(
				viewport
					? Math.max(
							0,
							window.innerHeight - (viewport.height + viewport.offsetTop),
						)
					: 0,
			);
		}

		update();
		viewport?.addEventListener("resize", update);
		viewport?.addEventListener("scroll", update);

		return () => {
			viewport?.removeEventListener("resize", update);
			viewport?.removeEventListener("scroll", update);
		};
	}, [isMenuOpen, layout]);

	// 本文を書き換えたあと、本文が更新されてから、カーソルを置く。
	useLayoutEffect(() => {
		if (selectionRequest !== null && textareaRef.current) {
			textareaRef.current.setSelectionRange(
				selectionRequest.caret,
				selectionRequest.caret,
			);
		}
	}, [selectionRequest]);

	// メニューからの「元に戻す」「やり直す」も、自前の履歴で行う（ブラウザの履歴に任せない）。
	// 番号・中黒の印の直後の Backspace は、印を一度に消す（スマホのキーボードでも届くよう、入力の直前のイベントで扱う）。
	const handleHistoryInput = useEffectEvent((event: InputEvent) => {
		if (event.inputType === "deleteContentBackward") {
			const textarea = textareaRef.current;

			if (!textarea || event.isComposing || compositionRef.current) {
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
		} else if (event.inputType === "historyUndo") {
			event.preventDefault();
			stepHistory("undo");
		} else if (event.inputType === "historyRedo") {
			event.preventDefault();
			stepHistory("redo");
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

	function recordHistory(
		before: TextSnapshot,
		after: TextSnapshot,
		kind: EditKind,
	) {
		historyRef.current = recordEdit(
			historyRef.current,
			before,
			after,
			kind,
			Date.now(),
		);
	}

	function syncCaret(textarea: HTMLTextAreaElement) {
		// Safari は、変換中の文字の範囲全体を選択状態にする。そのときのカーソルは、範囲の末尾。
		const position = compositionRef.current
			? textarea.selectionEnd
			: textarea.selectionStart;

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

		recordHistory(
			{
				text: value,
				caret: textarea?.selectionStart ?? caretRef.current,
			},
			next,
			"other",
		);
		writeText(next);
	}

	function stepHistory(direction: "undo" | "redo") {
		const textarea = textareaRef.current;

		if (!textarea) {
			return;
		}

		const current = { text: textarea.value, caret: textarea.selectionStart };
		const result = (direction === "undo" ? undoEdit : redoEdit)(
			historyRef.current,
			current,
		);

		if (result) {
			historyRef.current = result.history;
			writeText(result.snapshot);
		}
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

	// 変換中に候補を決める。Chromium 系は、変換を確定させてから、確定した文字を含めて置き換える。Safari は、変換中のまま書き換える（ブラウザが変換を取り消す）。
	// source は、候補を計算したときの本文とカーソル（変換で長さが変わった分を、置き換える範囲に反映する。元に戻すで、この状態に戻る）。
	async function acceptDuringComposition(
		item: RecipeTextCompletionItem,
		source: TextSnapshot,
	) {
		const textarea = textareaRef.current;
		const composition = compositionRef.current;

		if (!textarea || !composition || isAcceptingRef.current) {
			return;
		}

		isAcceptingRef.current = true;

		const shouldEnd = strategy === "end-then-replace";

		if (shouldEnd) {
			await endComposition(textarea);
		}

		const committed = textarea.value;
		const committedSnapshot = {
			text: committed,
			caret: textarea.selectionStart,
		};
		const result = applyRecipeTextCompletion(
			committed,
			{
				items: [
					adjustCompletionItem(item, {
						start: composition.start,
						delta: committed.length - source.text.length,
					}),
				],
			},
			0,
		);
		const next = { text: result.text, caret: result.caret };

		// 変換中の文字（「とま」）の段階を、履歴に残す。Safari は、確定を待たずに置き換えるので、候補を計算したときの本文を使う（Tab で IME が先に変換した文字ではなく）。
		const middle = shouldEnd ? committedSnapshot : source;

		recordHistory(composition.before, middle, "other");
		recordHistory(middle, next, "other");

		compositionRef.current = null;
		isAcceptingRef.current = false;
		setIsComposing(false);
		writeText(next);

		if (item.link) {
			onLinkSelected?.(item.link);
		}

		if (shouldEnd) {
			restoreFocus(textarea, next.caret);
		}
	}

	function handleCompositionStart(
		event: CompositionEvent<HTMLTextAreaElement>,
	) {
		const textarea = event.currentTarget;

		compositionRef.current = {
			before: { text: textarea.value, caret: textarea.selectionStart },
			start: textarea.selectionStart,
		};
		setIsComposing(true);
	}

	function handleCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
		const composition = compositionRef.current;

		// 候補を決める処理が、すでに扱っているときは、ここでは何もしない。
		if (!composition || isAcceptingRef.current) {
			return;
		}

		compositionRef.current = null;
		setIsComposing(false);

		const textarea = event.currentTarget;

		setAboveUntilChange({
			value: textarea.value,
			caret: textarea.selectionStart,
		});
		recordHistory(
			composition.before,
			{ text: textarea.value, caret: textarea.selectionStart },
			"other",
		);
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

	// 変換中の Tab で使う候補。今出ている候補。なければ、Safari の方式のときだけ、直前の入力（IME の変換）の前に出ていた候補。
	// 候補の選択を、1つ動かす（現在の選択がなければ、↓は先頭、↑は末尾）。
	function moveActive(direction: "up" | "down", itemCount: number) {
		const lastIndex = itemCount - 1;

		setActiveIndex((current) => {
			if (direction === "down") {
				return current === null ? 0 : Math.min(current + 1, lastIndex);
			}

			return current === null ? lastIndex : Math.max(current - 1, 0);
		});
	}

	function findCompletionForTab(): {
		completion: RecipeTextCompletion;
		value: string;
		caret: number;
	} | null {
		if (isOpen && completion) {
			return { completion, value, caret };
		}

		const previous = previousCompletionRef.current;

		if (
			strategy === "replace-in-place" &&
			previous &&
			performance.now() - previous.at < previousCompletionWindowMs
		) {
			return previous;
		}

		return null;
	}

	function handleCompositionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		const shown = findCompletionForTab();

		if (!shown) {
			return;
		}

		const items = shown.completion.items;
		const source = { text: shown.value, caret: shown.caret };

		// Windows は、1回のキーで、keydown が2回届く（1回目は key が Process、2回目が本物のキー）。1回だけ扱う。
		if (
			event.altKey &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.shiftKey &&
			(event.key === "ArrowDown" || event.key === "ArrowUp")
		) {
			event.preventDefault();
			moveActive(event.key === "ArrowDown" ? "down" : "up", items.length);
		} else if (event.code === "Tab" && !event.shiftKey) {
			event.preventDefault();
			void acceptDuringComposition(items[activeIndex ?? 0], source);
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// 変換中の操作は、IME に任せる。ただし、候補が出ているときは、次のキーを、IME の変換候補ではなく、補完に使う。
		// - Tab：決定（選んでいなければ先頭）
		// - Alt（Option）+↑↓：選択（素の矢印と Shift+矢印は、IME が使うので、IME に任せる）
		// - Enter は、IME が変換中の文字を確定する操作。止めても、Mac の IME は、確定の入力をあとから送ってきて、置き換えた本文の先頭に入ってしまう。補完には使わない。
		if (event.nativeEvent.isComposing) {
			if (compositionRef.current) {
				handleCompositionKeyDown(event);
			}

			return;
		}

		// 元に戻す・やり直す（Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y）は、自前の履歴で行う。
		if ((event.metaKey || event.ctrlKey) && !event.altKey) {
			const key = event.key.toLowerCase();

			if (key === "z") {
				event.preventDefault();
				stepHistory(event.shiftKey ? "redo" : "undo");

				return;
			}

			if (key === "y" && !event.metaKey) {
				event.preventDefault();
				stepHistory("redo");

				return;
			}
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
		if (compositionRef.current) {
			previousCompletionRef.current =
				isOpen && completion
					? { completion, value, caret, at: performance.now() }
					: null;
		} else {
			recordHistory(
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

	const candidates = completion?.items.map((item, index) => (
		<li key={item.label}>
			<button
				type="button"
				className={
					layout === "caret"
						? styles.completionPopupItem
						: styles.completionItem
				}
				// Tab は、候補の決定に使う。ボタンへは移らない。
				tabIndex={-1}
				aria-current={activeIndex === index}
				// 入力欄のフォーカスを外さないよう、押した時点で決定する（変換中は、変換を確定させてから置き換える）。
				onMouseDown={(event) => {
					event.preventDefault();

					if (compositionRef.current) {
						void acceptDuringComposition(item, { text: value, caret });
					} else {
						accept(index);
					}
				}}
			>
				{item.label}
			</button>
		</li>
	));

	return (
		<div ref={wrapperRef} className={styles.completionWrap}>
			<label className={styles.field}>
				<span>レシピの本文</span>
				<textarea
					ref={textareaRef}
					className={styles.bodyTextarea}
					value={value}
					placeholder={placeholder}
					onChange={handleChange}
					onSelect={(event) => syncCaret(event.currentTarget)}
					onScroll={() => setScrollTick((tick) => tick + 1)}
					onKeyDown={handleKeyDown}
					onCompositionStart={handleCompositionStart}
					onCompositionEnd={handleCompositionEnd}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>
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
				/>
			) : null}

			{isMenuOpen && layout === "caret" ? (
				<div
					ref={popupRef}
					className={styles.completionPopup}
					style={{
						top: popupPosition?.top ?? 0,
						left: popupPosition?.left ?? 0,
						visibility: popupPosition ? "visible" : "hidden",
					}}
				>
					{!completion ? (
						<output className={styles.completionNotice}>{otherNotice}</output>
					) : (
						<ul className={styles.completionPopupList} aria-label="補完の候補">
							{candidates}
						</ul>
					)}
					{!completion ? null : (
						<p className={styles.completionPopupHint}>
							{isComposing ? (
								<>
									<ShortcutKeys keys={["alt", "up-down"]} />
									で選び、
									<ShortcutKeys keys={["tab"]} />
									で決定
								</>
							) : (
								<>
									<ShortcutKeys keys={["up-down"]} />
									で選び、
									<ShortcutKeys keys={["tab"]} />
									で決定（
									<ShortcutKeys keys={["esc"]} />
									で閉じる）
								</>
							)}
						</p>
					)}
				</div>
			) : null}

			{isMenuOpen && layout === "keyboard-bar" ? (
				<div className={styles.completionBar} style={{ bottom: barBottom }}>
					{!completion ? (
						<output className={styles.completionNotice}>{otherNotice}</output>
					) : (
						<ul className={styles.completionBarList} aria-label="補完の候補">
							{candidates}
						</ul>
					)}
				</div>
			) : null}
		</div>
	);
}
