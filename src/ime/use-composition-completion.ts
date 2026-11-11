import {
	type CompositionEvent,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import type { CompositionStrategy } from "./choose-composition-strategy";
import {
	previousCompletionWindowMs,
	readCompletionKey,
} from "./completion-keys";
import {
	dropLateCommit,
	endComposition,
	restoreFocus,
} from "./end-composition";
import type { TextSnapshot } from "./text-history";
import { useCompositionStrategy } from "./use-composition-strategy";

// 確定のきっかけ。Mac の Chrome（2026-11-11 の実機の記録）：
// - キー（Enter など）で確定：変換中のキーの直後（数ミリ秒）に、確定（compositionend）が届く。
// - クリックで確定：キーなしで確定が届き、その数十ミリ秒あとに、pointerdown・mousedown が届く（押した時点では、もう確定している）。
// クリックで確定したときは、そのクリックが終わるまで、メニューを動かさない（動くと、クリックが、動いた先に当たる）。
// キーで確定したときは、すぐ通常の位置に戻す。
const keyCommitWindowMs = 100;
// クリックが来ないとき（ほかのきっかけの確定）に、メニューを戻すまでの時間。
const pointerHoldFallbackMs = 1000;

// 補完する入力欄（複数行の本文と、1行の入力欄）。
type CompletionField = HTMLTextAreaElement | HTMLInputElement;

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
	fieldRef: { readonly current: CompletionField | null };
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

// 入力欄の、変換中（IME）の補完。レシピの本文、買い物メモの「まとめて追加」、食材名の入力欄で共通。
// - Chromium 系（Mac・Windows）：変換を確定させてから、確定した文字を含めて置き換える。
// - Safari・Android：変換中のまま書き換える（ブラウザが変換を取り消す）。
// - ほか（iPhone・Firefox・未確認）：変換中は候補を出さず、確定してから出す。
// 変換中のキーの決まりは、completion-keys.ts。
export function useCompositionCompletion<C>({
	fieldRef,
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
	// クリックで確定したときの本文（そのクリックが終わるまで、本文が変わらなければ、メニューの位置を動かさない）。
	const [heldText, setHeldText] = useState<string | null>(null);
	// 動かさないのをやめる処理（クリックを待つ間だけ）。
	const releaseHoldRef = useRef<(() => void) | null>(null);
	// 変換中のキーを最後に押した時刻（確定のきっかけを見分ける）。
	const composingKeyAtRef = useRef(Number.NEGATIVE_INFINITY);

	// 呼び出し側のキーの扱いに関わらず、変換中のキーを見る（入力欄の上で、先に受ける）。
	useEffect(() => {
		const field = fieldRef.current;

		function noteKey(event: Event) {
			if (event instanceof KeyboardEvent && event.isComposing) {
				composingKeyAtRef.current = performance.now();
			}
		}

		field?.addEventListener("keydown", noteKey, true);

		return () => {
			field?.removeEventListener("keydown", noteKey, true);
			releaseHoldRef.current?.();
		};
	}, [fieldRef]);

	// クリックで確定したとき：そのクリックが終わるまで（来なければ、少し待つまで）、メニューを動かさない。
	function holdUntilClick(text: string) {
		function release() {
			window.removeEventListener("click", release, true);
			window.clearTimeout(timer);
			releaseHoldRef.current = null;
			setHeldText(null);
		}

		const timer = window.setTimeout(release, pointerHoldFallbackMs);

		window.addEventListener("click", release, true);
		releaseHoldRef.current = release;
		setHeldText(text);
	}
	const strategy = useCompositionStrategy(strategyOverride);

	// 変換中に候補を出してよいか（出せない環境は、確定したあとに出す）。
	const canCompleteWhileComposing =
		!isComposing || strategy !== "wait-for-confirmation";

	// メニューをカーソルの上に出すか。変換中は、IME の窓（文字の下に出る）を避ける。クリックで確定したときは、そのクリックが終わるまで（本文が変われば、そこまで）、確定の前の位置のまま。
	// カーソルの位置は比べない（確定の直後は、選択の範囲が動く途中で、画面が持つカーソルの位置が遅れる）。
	function prefersAbove(text: string): boolean {
		return isComposing || heldText === text;
	}

	// Safari は、変換中の文字の範囲全体を選択状態にする。そのときのカーソルは、範囲の末尾。
	function readCaret(field: CompletionField): number {
		return (
			(compositionRef.current ? field.selectionEnd : field.selectionStart) ?? 0
		);
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
		const field = fieldRef.current;
		const composition = compositionRef.current;

		if (!field || !composition || isAcceptingRef.current) {
			return;
		}

		isAcceptingRef.current = true;

		const shouldEnd = strategy === "end-then-replace";
		const committedText = shouldEnd ? await endComposition(field) : null;
		const committed = {
			text: field.value,
			caret: field.selectionStart ?? field.value.length,
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
			if (committedText) {
				dropLateCommit(field, committedText, next.caret);
			}

			restoreFocus(field, next.caret);
		}
	}

	// メニューの候補を押して決める（変換中なら、キーで決めるときと同じく、変換を片づけてから。そうでなければ、acceptNow）。
	function acceptChosen(
		completion: C,
		index: number,
		source: CaretSnapshot,
		acceptNow: () => void,
	): void {
		if (compositionRef.current) {
			void accept(completion, index, source);
		} else {
			acceptNow();
		}
	}

	function onCompositionStart(event: CompositionEvent<CompletionField>) {
		const field = event.currentTarget;
		const start = field.selectionStart ?? field.value.length;

		compositionRef.current = {
			before: { text: field.value, caret: start },
			start,
		};
		setIsComposing(true);
	}

	function handleCompositionEnd(event: CompositionEvent<CompletionField>) {
		const composition = compositionRef.current;

		// 候補を決める処理が、すでに扱っているときは、ここでは何もしない。
		if (!composition || isAcceptingRef.current) {
			return;
		}

		compositionRef.current = null;
		setIsComposing(false);

		const field = event.currentTarget;
		const after = {
			text: field.value,
			caret: field.selectionStart ?? field.value.length,
		};

		releaseHoldRef.current?.();

		if (performance.now() - composingKeyAtRef.current >= keyCommitWindowMs) {
			holdUntilClick(after.text);
		}

		onCompositionEnd?.({ before: composition.before, after });
	}

	// 変換中のキー操作（決まりは readCompletionKey）。変換中なら true を返す（呼び出し側は、そのまま戻る）。
	function handleKeyDown(
		event: KeyboardEvent<CompletionField>,
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

		const key = readCompletionKey(event, true);

		if (key === "up" || key === "down") {
			event.preventDefault();
			moveActive(key);
		} else if (key === "accept") {
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
		acceptChosen,
		handleKeyDown,
		onCompositionStart,
		onCompositionEnd: handleCompositionEnd,
	};
}
