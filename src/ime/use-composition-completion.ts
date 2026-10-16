import {
	type CompositionEvent,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	type CompositionStrategy,
	chooseCompositionStrategy,
} from "./choose-composition-strategy";
import { endComposition, restoreFocus } from "./end-composition";
import { readBrowserEnvironment } from "./read-browser-environment";
import type { TextSnapshot } from "./text-history";

// 入力欄の、本文とカーソル。
export type CaretSnapshot = TextSnapshot;

// 変換中（IME の入力中）の、変換の前の状態と、変換が始まった位置。
export type Composition = { before: CaretSnapshot; start: number };

// 今出ている候補（C は、呼び出し側の候補のまとまり）。text・caret は、候補を計算したときの本文とカーソル。
export type ShownCompletion<C> = {
	completion: C;
	count: number;
	text: string;
	caret: number;
};

export type CommitContext = {
	composition: Composition;
	// 候補を計算したときの本文とカーソル（変換で長さが変わった分を、置き換える範囲に反映するために使う）。
	source: CaretSnapshot;
	// 変換を確定させたあとの、本文とカーソル（確定させない方式では、変換中のまま）。
	committed: CaretSnapshot;
	// 変換を確定させてから置き換えたか。
	shouldEnd: boolean;
};

type Options<C> = {
	textareaRef: { readonly current: HTMLTextAreaElement | null };
	// 変換中の補完の方式（なければ、ブラウザから判定する）。テストで指定する。
	strategy?: CompositionStrategy;
	// 変換中に決めた候補で、本文を書き換える。書き換えたあとの状態を返す。
	apply: (
		completion: C,
		index: number,
		context: CommitContext,
	) => CaretSnapshot;
	// 候補を決めずに、変換が終わったとき。
	onCompositionEnd?: (change: {
		before: CaretSnapshot;
		after: CaretSnapshot;
	}) => void;
};

type KeyContext<C> = {
	shown: ShownCompletion<C> | null;
	activeIndex: number | null;
	moveActive: (direction: "up" | "down") => void;
};

// Safari で、IME の変換と Tab のキーのイベントが、続けて届くとみなす時間（ミリ秒）。
const previousCompletionWindowMs = 100;

// 入力欄の、変換中（IME）の補完。レシピの本文と、買い物メモの「まとめて追加」で共通。
// - Chromium 系（Mac・Windows）：変換を確定させてから、確定した文字を含めて置き換える。
// - Safari・Android：変換中のまま書き換える（ブラウザが変換を取り消す）。
// - ほか（iPhone・Firefox・未確認）：変換中は候補を出さず、確定してから出す。
// 変換中の候補は、Tab で決定、Alt（Option）+↑↓ で選ぶ（素の矢印と Enter は IME が使う）。
export function useCompositionCompletion<C>({
	textareaRef,
	strategy: strategyOverride,
	apply,
	onCompositionEnd,
}: Options<C>) {
	const compositionRef = useRef<Composition | null>(null);
	// 変換中に候補を決める処理の間は、変換の終わりを、ここでは扱わない。
	const isAcceptingRef = useRef(false);
	// 変換中の入力の直前に出ていた候補。Safari は、Tab の前に IME が変換して本文が変わってから、キーのイベントが届くので、そのときに使う。
	const previousRef = useRef<(ShownCompletion<C> & { at: number }) | null>(
		null,
	);
	const [isComposing, setIsComposing] = useState(false);
	// サーバーと同じ初期値で描画し、ブラウザで判定する。
	const [detected, setDetected] = useState<CompositionStrategy>(
		"wait-for-confirmation",
	);
	// 変換が確定した位置（確定のあと、本文かカーソルが動くまで、メニューの位置を動かさない）。
	const [aboveUntilChange, setAboveUntilChange] =
		useState<CaretSnapshot | null>(null);
	const strategy = strategyOverride ?? detected;

	useEffect(() => {
		setDetected(chooseCompositionStrategy(readBrowserEnvironment()));
	}, []);

	// 変換中に候補を出してよいか（出せない環境は、確定したあとに出す）。
	const canCompleteWhileComposing =
		!isComposing || strategy !== "wait-for-confirmation";

	// メニューをカーソルの上に出すか。変換中は、IME の窓（文字の下に出る）を避ける。確定の直後は、確定の前の位置のまま
	// （確定でメニューが下に移ると、その直後に届くクリックが、移った先に当たってしまうため）。
	function prefersAbove(text: string, caret: number): boolean {
		return (
			isComposing ||
			(aboveUntilChange?.text === text && aboveUntilChange.caret === caret)
		);
	}

	// Safari は、変換中の文字の範囲全体を選択状態にする。そのときのカーソルは、範囲の末尾。
	function readCaret(textarea: HTMLTextAreaElement): number {
		return compositionRef.current
			? textarea.selectionEnd
			: textarea.selectionStart;
	}

	// 変換中の入力（change）で呼ぶ。変換中なら、直前に出ていた候補を覚えて、true を返す（履歴の記録は、変換が終わるまで待つ）。
	function noteChange(shown: ShownCompletion<C> | null): boolean {
		if (!compositionRef.current) {
			return false;
		}

		previousRef.current = shown ? { ...shown, at: performance.now() } : null;

		return true;
	}

	async function accept(
		completion: C,
		index: number,
		source: CaretSnapshot,
	): Promise<void> {
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

		const committed = {
			text: textarea.value,
			caret: textarea.selectionStart,
		};

		compositionRef.current = null;
		isAcceptingRef.current = false;
		setIsComposing(false);

		const next = apply(completion, index, {
			composition,
			source,
			committed,
			shouldEnd,
		});

		if (shouldEnd) {
			restoreFocus(textarea, next.caret);
		}
	}

	function onCompositionStart(event: CompositionEvent<HTMLTextAreaElement>) {
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
		const after = { text: textarea.value, caret: textarea.selectionStart };

		setAboveUntilChange(after);
		onCompositionEnd?.({ before: composition.before, after });
	}

	// 変換中のキー操作。変換中なら true を返す（呼び出し側は、そのまま戻る）。
	// - Tab：決定（選んでいなければ先頭）
	// - Alt（Option）+↑↓：選択（素の矢印と Shift+矢印は、IME が使うので、IME に任せる）
	// - Enter は、IME が変換中の文字を確定する操作。止めても、Mac の IME は、確定の入力をあとから送ってきて、置き換えた本文の先頭に入ってしまう。補完には使わない。
	function handleKeyDown(
		event: KeyboardEvent<HTMLTextAreaElement>,
		{ shown, activeIndex, moveActive }: KeyContext<C>,
	): boolean {
		if (!event.nativeEvent.isComposing) {
			return false;
		}

		if (!compositionRef.current) {
			return true;
		}

		// 今出ている候補。なければ、Safari の方式のときだけ、直前の入力（IME の変換）の前に出ていた候補。
		const previous = previousRef.current;
		const target =
			shown ??
			(strategy === "replace-in-place" &&
			previous &&
			performance.now() - previous.at < previousCompletionWindowMs
				? previous
				: null);

		if (!target) {
			return true;
		}

		// Windows は、1回のキーで、keydown が2回届く（1回目は key が Process、2回目が本物のキー）。1回だけ扱う。
		if (
			event.altKey &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.shiftKey &&
			(event.key === "ArrowDown" || event.key === "ArrowUp")
		) {
			event.preventDefault();
			moveActive(event.key === "ArrowDown" ? "down" : "up");
		} else if (event.code === "Tab" && !event.shiftKey) {
			event.preventDefault();
			void accept(target.completion, activeIndex ?? 0, {
				text: target.text,
				caret: target.caret,
			});
		}

		return true;
	}

	return {
		strategy,
		isComposing,
		canCompleteWhileComposing,
		prefersAbove,
		readCaret,
		noteChange,
		// 変換中か（refで見る。描画を待たない）。
		isActive: () => compositionRef.current !== null,
		accept,
		handleKeyDown,
		onCompositionStart,
		onCompositionEnd: handleCompositionEnd,
	};
}
